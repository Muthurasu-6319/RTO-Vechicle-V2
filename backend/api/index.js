const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cache = require('memory-cache');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const cloudinary = require('cloudinary').v2;
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Cloudinary config (for images - barcode & RC photos)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer - store files in memory for B2 upload
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB limit

// Configure S3 for Backblaze B2
const s3Client = new S3Client({
  endpoint: process.env.B2_ENDPOINT,
  region: process.env.B2_REGION,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY,
  }
});
const b2BucketName = process.env.B2_BUCKET_NAME;

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
let db;

let firebaseInitError = null;

// Initialize Firebase
try {
  if (!getApps().length) {
    // Handle Vercel environment variable parsing quirks (users often paste with quotes)
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey) {
      privateKey = privateKey.replace(/^"|"$/g, ''); // Strip quotes
      privateKey = privateKey.replace(/\\n/g, '\n'); // Fix escaped newlines
    }

    let projectId = process.env.FIREBASE_PROJECT_ID;
    if (projectId) projectId = projectId.replace(/^"|"$/g, ''); // Strip quotes

    let clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    if (clientEmail) clientEmail = clientEmail.replace(/^"|"$/g, ''); // Strip quotes

    if (!projectId || !privateKey || !clientEmail) {
      throw new Error('Missing Firebase Environment Variables. Please check Vercel settings.');
    }

    initializeApp({
      credential: cert({
        projectId: projectId,
        privateKey: privateKey,
        clientEmail: clientEmail,
      })
    });
    console.log('Firebase Admin initialized successfully');
  }
  db = getFirestore();
} catch (error) {
  firebaseInitError = error.message;
  console.error('Firebase Admin initialization error:', error.message);
}

// Middleware to check if Firebase Admin DB is initialized
const requireDb = (req, res, next) => {
  if (!db) {
    return res.status(503).json({ 
      error: 'Firebase Admin not configured on server',
      details: firebaseInitError || 'Missing Firebase Environment Variables (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL)'
    });
  }
  next();
};

// Basic API Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'success', 
    message: 'RTO Portal V2 Backend is running successfully on Vercel!',
    firebaseStatus: db ? 'Connected' : 'Failed',
    firebaseError: firebaseInitError
  });
});


// Hybrid Upload Route: Images → Cloudinary, PDFs → Backblaze B2
app.post('/api/upload/file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const isImage = req.file.mimetype.startsWith('image/');
    const folder = req.body.folder || 'documents';

    if (isImage) {
      // ── IMAGES → Cloudinary (public URL for easy preview) ──
      const base64 = req.file.buffer.toString('base64');
      const dataUri = `data:${req.file.mimetype};base64,${base64}`;

      const uploadResult = await cloudinary.uploader.upload(dataUri, {
        folder: folder,
        resource_type: 'image',
        use_filename: false,
      });

      console.log('Image uploaded to Cloudinary:', uploadResult.public_id);
      res.json({ fileUrl: uploadResult.secure_url, objectKey: uploadResult.public_id, filename: uploadResult.original_filename });

    } else {
      // ── PDFs → Backblaze B2 (private, signed URL for download) ──
      const originalName = req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '');
      const uniqueFileName = `${Date.now()}-${originalName}`;
      const objectKey = `${folder}/${uniqueFileName}`;

      const command = new PutObjectCommand({
        Bucket: b2BucketName,
        Key: objectKey,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      });

      await s3Client.send(command);
      const fileUrl = `${process.env.B2_ENDPOINT}/${b2BucketName}/${objectKey}`;
      console.log('PDF uploaded to B2:', objectKey);
      res.json({ fileUrl, objectKey, filename: uniqueFileName });
    }

  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file', details: error.message });
  }
});

// Gemini OCR Route
app.post('/api/scan-barcode', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: 'No image URL provided' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('OCR Error: GEMINI_API_KEY environment variable is not configured.');
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on backend server.' });
    }

    // Download the image
    const imageResp = await fetch(imageUrl);
    if (!imageResp.ok) {
      return res.status(400).json({ error: 'Failed to fetch image from provided URL' });
    }

    const arrayBuffer = await imageResp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const rawMimeType = imageResp.headers.get('content-type') || 'image/jpeg';
    const mimeType = rawMimeType.split(';')[0].trim();

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Try gemini-1.5-flash first, fallback to gemini-2.0-flash
    let model;
    try {
      model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    } catch (e) {
      model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    }

    const prompt = `Inspect this image of a device barcode/label carefully.
1. Find the 15-digit IMEI number (e.g., 864201049281726).
2. Find the VLD Serial Number (S.No / Serial Number, e.g., IRSN..., HITECH..., or similar).

Return ONLY a valid JSON object without any markdown formatting or surrounding text.
Example format: {"imei": "864201049281726", "vldSerial": "IRSN123456"}`;

    const imageParts = [
      {
        inlineData: {
          data: buffer.toString("base64"),
          mimeType
        }
      }
    ];

    let responseText = '';
    try {
      const result = await model.generateContent([prompt, ...imageParts]);
      responseText = result.response.text();
    } catch (apiErr) {
      console.warn('Gemini 1.5 Flash OCR failed, trying gemini-2.0-flash fallback:', apiErr.message);
      const fallbackModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const fallbackResult = await fallbackModel.generateContent([prompt, ...imageParts]);
      responseText = fallbackResult.response.text();
    }

    // Clean up markdown wrappers
    const cleanedText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();

    let parsedData = { imei: '', vldSerial: '' };
    try {
      parsedData = JSON.parse(cleanedText);
    } catch (e) {
      console.warn('JSON parsing failed for OCR response, attempting regex extraction:', e.message);
    }

    // Robust Regex fallback for 15-digit IMEI if missing or invalid
    if (!parsedData.imei || String(parsedData.imei).length !== 15) {
      const imeiMatch = responseText.match(/\b\d{15}\b/);
      if (imeiMatch) parsedData.imei = imeiMatch[0];
    }

    // Regex fallback for VLD Serial Number
    if (!parsedData.vldSerial) {
      const vldMatch = responseText.match(/\b(IRSN|IRNS|HITECH|HITEH|VLD)[A-Z0-9-]+\b/i);
      if (vldMatch) parsedData.vldSerial = vldMatch[0];
    }

    res.json(parsedData);
  } catch (error) {
    console.error('OCR Error:', error);
    res.status(500).json({ error: 'Failed to extract data from image', details: error.message });
  }
});

// In-memory cache for created admins to prevent login failure if database quota is exceeded
const inMemoryAdmins = [];

// Admin Authentication Route
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const cleanEmail = (email || '').toLowerCase().trim();
  const cleanPassword = (password || '').trim();
  
  try {
    // 1. Check Hardcoded Superadmin Fallback
    if (cleanEmail === 'admin@gmail.com' && cleanPassword === 'admin') {
      return res.json({ token: 'mock-jwt-token-for-admin', role: 'full admin', manufacturer: '', name: 'Super Admin', email: 'admin@gmail.com' });
    }

    // 3. Check inMemoryAdmins cache (case-insensitive email, trimmed password)
    const memAdmin = inMemoryAdmins.find(a => 
      a.email && a.email.toLowerCase().trim() === cleanEmail && 
      (a.password || '').trim() === cleanPassword
    );
    if (memAdmin) {
      return res.json({ 
        token: 'mock-jwt-token-for-admin-' + (memAdmin.id || 'mem'), 
        role: memAdmin.role || 'standard', 
        manufacturer: memAdmin.manufacturer || '',
        name: memAdmin.name || 'Standard Admin',
        email: memAdmin.email || cleanEmail
      });
    }

    // 4. Check Database for Admin Users
    try {
      const adminsRef = db.collection('admins');
      const snapshot = await adminsRef.get();

      if (!snapshot.empty) {
        let validAdmin = null;
        snapshot.forEach(doc => {
          const adminData = doc.data();
          const adminEmail = (adminData.email || '').toLowerCase().trim();
          const adminPassword = (adminData.password || '').trim();
          if (adminEmail === cleanEmail && adminPassword === cleanPassword) {
            validAdmin = { id: doc.id, ...adminData };
          }
        });

        if (validAdmin) {
          // Cache in memory for fast future logins
          const existingIdx = inMemoryAdmins.findIndex(a => a.id === validAdmin.id || (a.email && a.email.toLowerCase().trim() === cleanEmail));
          if (existingIdx !== -1) {
            inMemoryAdmins[existingIdx] = validAdmin;
          } else {
            inMemoryAdmins.push(validAdmin);
          }

          return res.json({ 
            token: 'mock-jwt-token-for-admin-' + validAdmin.id, 
            role: validAdmin.role || 'standard', 
            manufacturer: validAdmin.manufacturer || '',
            name: validAdmin.name || 'Standard Admin',
            email: validAdmin.email || cleanEmail
          });
        }
      }
    } catch (dbErr) {
      console.warn('Database login lookup failed (Quota/Network), checking in-memory admins:', dbErr.message);
    }

    res.status(401).json({ error: 'Invalid email or password. Please try again.' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: 'Authentication failed. Please try again.' });
  }
});

// --- ADMIN MANAGEMENT ROUTES --- //

app.post('/api/admins', async (req, res) => {
  try {
    const data = req.body;
    data.createdAt = new Date().toISOString();
    let id = 'mem_' + Date.now();
    try {
      const docRef = await db.collection('admins').add(data);
      id = docRef.id;
    } catch (dbErr) {
      console.warn('Firestore admin save failed, saved in memory:', dbErr.message);
    }
    data.id = id;
    inMemoryAdmins.push(data);
    res.status(201).json({ message: 'Admin created successfully', id });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admins', async (req, res) => {
  try {
    const admins = [...inMemoryAdmins];
    try {
      const snapshot = await db.collection('admins').get();
      snapshot.forEach(doc => {
        const dData = doc.data();
        if (!admins.some(a => a.id === doc.id || (a.email && dData.email && a.email.toLowerCase() === dData.email.toLowerCase()))) {
          admins.push({ id: doc.id, ...dData });
        }
      });
    } catch (dbErr) {
      console.warn('Firestore admins fetch failed, returning cached list:', dbErr.message);
    }
    res.json(admins);
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.json(inMemoryAdmins);
  }
});

app.put('/api/admins/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const oldEmail = (data.oldEmail || '').toLowerCase().trim();
    const newEmail = (data.email || '').toLowerCase().trim();
    
    const idx = inMemoryAdmins.findIndex(a => 
      a.id === id || 
      (oldEmail && a.email && a.email.toLowerCase().trim() === oldEmail) ||
      (newEmail && a.email && a.email.toLowerCase().trim() === newEmail)
    );

    if (idx !== -1) {
      inMemoryAdmins[idx] = { ...inMemoryAdmins[idx], ...data, id: inMemoryAdmins[idx].id || id };
    } else {
      inMemoryAdmins.push({ id, ...data });
    }

    try {
      await db.collection('admins').doc(id).update(data);
    } catch (e) {
      console.warn('Firestore admin update failed:', e.message);
    }
    res.json({ message: 'Admin updated successfully' });
  } catch (error) {
    console.error('Error updating admin:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admins/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = (id || '').toLowerCase().trim();

    for (let i = inMemoryAdmins.length - 1; i >= 0; i--) {
      const a = inMemoryAdmins[i];
      if (a.id === id || (a.email && a.email.toLowerCase().trim() === cleanId)) {
        inMemoryAdmins.splice(i, 1);
      }
    }

    try {
      if (db) {
        await db.collection('admins').doc(id).delete();
        const snap = await db.collection('admins').where('email', '==', cleanId).get();
        snap.forEach(d => d.ref.delete());
      }
    } catch (e) {
      console.warn('Firestore admin delete failed:', e.message);
    }
    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Error deleting admin:', error);
    res.status(500).json({ error: error.message });
  }
});


// Admin Route: Create User
app.post('/api/users/create', async (req, res) => {
  try {
    const { fullName, mobile, email, password } = req.body;

    // 1. Create user in Firebase Authentication
    const userRecord = await getAuth().createUser({
      email,
      password,
      displayName: fullName,
    });

    // 2. Save user details in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      fullName,
      mobile,
      email,
      role: 'user',
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ message: 'User created successfully', uid: userRecord.uid });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin Route: Get All Users
app.get('/api/users', async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
    const users = [];
    usersSnapshot.forEach(doc => {
      users.push({ id: doc.id, ...doc.data() });
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin Route: Update User
app.put('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { fullName, mobile, email, password } = req.body;

    const authUpdates = {
      email,
      displayName: fullName,
    };
    
    if (password && password.length >= 6) {
      authUpdates.password = password;
    }

    // Update in Auth (optional, if we allow changing email/name/password)
    await getAuth().updateUser(uid, authUpdates);

    // Update in Firestore
    await db.collection('users').doc(uid).update({
      fullName,
      mobile,
      email,
    });

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin Route: Delete User
app.delete('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    
    // Delete from Auth
    await getAuth().deleteUser(uid);
    // Delete from Firestore
    await db.collection('users').doc(uid).delete();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin Route: Get Stats
app.get('/api/stats/admin', async (req, res) => {
  try {
    const { manufacturer } = req.query;
    const appsSnapshot = await db.collection('applications').get();
    let totalApps = 0;
    let pendingApps = 0;
    let certifiedApps = 0;
    let installedApps = 0;

    appsSnapshot.forEach(doc => {
      const data = doc.data();
      if (manufacturer && (data.manufacturer || '').trim().toLowerCase() !== manufacturer.trim().toLowerCase()) {
        return; // Skip apps not belonging to standard admin's manufacturer
      }
      totalApps++;
      const st = data.status || 'Pending';
      if (st === 'Pending') pendingApps++;
      if (st === 'Certified') certifiedApps++;
      if (['Installed', 'TempCertUploaded', 'RTOApproved'].includes(st)) installedApps++;
    });

    const usersSnapshot = await db.collection('users').count().get();
    const totalUsers = usersSnapshot.data().count;

    const ordersSnapshot = await db.collection('orders').count().get();
    const totalOrders = ordersSnapshot.data().count;

    const stockDoc = await db.collection('settings').doc('dashboard').get();
    const deviceStock = stockDoc.exists ? (stockDoc.data().deviceStock || 0) : 0;

    const statsData = {
      totalUsers,
      applications: totalApps,
      pendingReview: pendingApps,
      certificatesIssued: certifiedApps,
      installed: installedApps,
      totalOrders,
      deviceStock,
      subscriptions: 0
    };
    
    res.json(statsData);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- APPLICATIONS ROUTES --- //

// Helper to get applications with memory caching (60s TTL)
async function getApplicationsCached() {
  const cached = cache.get('all_applications');
  if (cached && Array.isArray(cached) && cached.length > 0) {
    return cached;
  }
  
  const snapshot = await db.collection('applications').get();
  const apps = [];
  snapshot.forEach(doc => {
    apps.push({ id: doc.id, ...doc.data() });
  });
  if (apps.length > 0) {
    cache.put('all_applications', apps, 60 * 1000); // 1 minute cache
  }
  return apps;
}

// Check if IMEI, VLD S.No, or Vehicle No already exists
app.post('/api/applications/check-unique', async (req, res) => {
  try {
    const { imei, vldSerial, vehicleNo } = req.body;
    const result = { imeiExists: false, vldExists: false, vehicleExists: false };

    const cleanImei = String(imei || '').trim();
    const cleanVld = String(vldSerial || '').trim();
    const cleanVehicle = String(vehicleNo || '').replace(/[\s\-_]/g, '').toUpperCase();

    if (!cleanImei && !cleanVld && !cleanVehicle) {
      return res.json(result);
    }

    let apps = [];
    try {
      const snapshot = await db.collection('applications').get();
      snapshot.forEach(doc => {
        apps.push({ id: doc.id, ...doc.data() });
      });
      if (apps.length > 0) {
        cache.put('all_applications', apps, 60 * 1000);
      }
    } catch (e) {
      console.warn('Uniqueness check DB warning:', e.message);
      try { apps = await getApplicationsCached(); } catch (err) {}
    }

    if (cleanImei) {
      result.imeiExists = apps.some(a => {
        const val = String(a.imei || a.imeiNo || a.IMEI || a.imeiNumber || '').trim();
        return val && val === cleanImei;
      });
    }
    if (cleanVld) {
      result.vldExists = apps.some(a => {
        const val = String(a.vldSerial || a.vldNo || a.vldSerialNo || a.serialNo || '').trim();
        return val && val === cleanVld;
      });
    }
    if (cleanVehicle) {
      result.vehicleExists = apps.some(a => {
        const val = String(a.vehicleNo || a.regNo || a.registrationNo || a.vehicleNumber || '').replace(/[\s\-_]/g, '').toUpperCase();
        return val && val === cleanVehicle;
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error checking uniqueness:', error);
    res.json({ imeiExists: false, vldExists: false, vehicleExists: false });
  }
});

// Create Application (User)
app.post('/api/applications', async (req, res) => {
  try {
    const data = req.body;
    let apps = [];
    try {
      const snapshot = await db.collection('applications').get();
      snapshot.forEach(doc => {
        apps.push({ id: doc.id, ...doc.data() });
      });
      if (apps.length > 0) {
        cache.put('all_applications', apps, 60 * 1000);
      }
    } catch (e) {
      console.warn('DB fetch warning during app creation:', e.message);
      try { apps = await getApplicationsCached(); } catch (err) {}
    }

    const cleanImei = String(data.imei || '').trim();
    const cleanVld = String(data.vldSerial || '').trim();
    const cleanVehicle = String(data.vehicleNo || '').replace(/[\s\-_]/g, '').toUpperCase();

    // Check if IMEI already exists
    if (cleanImei && apps.some(a => String(a.imei || a.imeiNo || a.IMEI || '').trim() === cleanImei)) {
      return res.status(400).json({ error: 'This IMEI number is already registered.' });
    }

    // Check if Vehicle No already exists
    if (cleanVehicle && apps.some(a => String(a.vehicleNo || a.regNo || a.registrationNo || '').replace(/[\s\-_]/g, '').toUpperCase() === cleanVehicle)) {
      return res.status(400).json({ error: 'This vehicle number is already registered.' });
    }

    // Check if VLD Serial already exists
    if (cleanVld && apps.some(a => String(a.vldSerial || a.vldNo || a.vldSerialNo || '').trim() === cleanVld)) {
      return res.status(400).json({ error: 'This VLD S.No is already registered.' });
    }

    data.status = 'Pending';
    data.createdAt = new Date().toISOString();
    
    const docRef = await db.collection('applications').add(data);
    cache.del('all_applications'); // Invalidate cache so new app is reflected immediately
    
    // Trigger Admin Notification (non-blocking so quota/notification error does not break submission)
    try {
      await db.collection('notifications').add({
        userId: 'admin',
        title: 'New Application Received',
        message: `A new certificate application has been submitted for vehicle ${data.vehicleNo}.`,
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (notifErr) {
      console.warn('Admin notification creation skipped:', notifErr.message);
    }

    res.status(201).json({ message: 'Application submitted successfully', id: docRef.id });
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get All Applications (Admin/User)
app.get('/api/applications', async (req, res) => {
  try {
    const { manufacturer, userId } = req.query;
    const allApps = await getApplicationsCached();
    let applications = allApps.filter(data => {
      if (manufacturer && (data.manufacturer || '').trim().toLowerCase() !== manufacturer.trim().toLowerCase()) {
        return false;
      }
      if (userId && data.userId !== userId) {
        return false;
      }
      return true;
    });
    
    // Sort in memory to avoid composite index requirement
    applications.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    
    res.json(applications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve Application (Admin - Moves to Installed)
app.put('/api/applications/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get application to find userId
    const appDoc = await db.collection('applications').doc(id).get();
    const appData = appDoc.exists ? appDoc.data() : null;

    await db.collection('applications').doc(id).update({
      status: 'Installed',
      approvedAt: new Date().toISOString()
    });
    cache.del('all_applications');

    if (appData && appData.userId) {
      try {
        await db.collection('notifications').add({
          userId: appData.userId,
          title: 'Application Approved',
          message: `Your application for vehicle ${appData.vehicleNo || 'Unknown'} has been approved!`,
          read: false,
          createdAt: new Date().toISOString()
        });
      } catch (e) {}
    }

    res.json({ message: 'Application moved to Installed successfully' });
  } catch (error) {
    console.error('Error approving application:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete Application
app.delete('/api/applications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('applications').doc(id).delete();
    cache.del('all_applications');
    res.json({ message: 'Application deleted successfully' });
  } catch (error) {
    console.error('Error deleting application:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin Uploads Temp Certificate
app.put('/api/applications/:id/temp-cert', async (req, res) => {
  try {
    const { id } = req.params;
    const { tempCertUrl } = req.body;

    // Fetch application to get userId and vehicleNo
    const appDoc = await db.collection('applications').doc(id).get();
    const appData = appDoc.exists ? appDoc.data() : null;

    await db.collection('applications').doc(id).update({
      status: 'TempCertUploaded',
      tempCertUrl: tempCertUrl,
      tempCertUploadedAt: new Date().toISOString()
    });
    cache.del('all_applications');

    // Send notification to user
    if (appData && appData.userId) {
      try {
        await db.collection('notifications').add({
          userId: appData.userId,
          title: 'Temporary Certificate Ready',
          message: `Your Temporary Certificate for vehicle ${appData.vehicleNo || 'Unknown'} is ready. Please check your Installed section.`,
          read: false,
          createdAt: new Date().toISOString()
        });
      } catch (e) {}
    }

    res.json({ message: 'Temporary Certificate uploaded successfully' });
  } catch (error) {
    console.error('Error uploading temp cert:', error);
    res.status(500).json({ error: error.message });
  }
});

// User clicks RTO Approved
app.put('/api/applications/:id/rto-approve', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('applications').doc(id).update({
      status: 'RTOApproved',
      rtoApprovedAt: new Date().toISOString()
    });
    cache.del('all_applications');
    res.json({ message: 'RTO Approved successfully' });
  } catch (error) {
    console.error('Error RTO approving:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin clicks No (reverts status to Installed so user can approve Yes again)
app.put('/api/applications/:id/rto-reject', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('applications').doc(id).update({
      status: 'Installed',
      rtoRejectedAt: new Date().toISOString()
    });
    cache.del('all_applications');
    res.json({ message: 'Status updated to Installed successfully' });
  } catch (error) {
    console.error('Error RTO rejecting:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin Uploads Vahan Certificate
app.put('/api/applications/:id/vahan-cert', async (req, res) => {
  try {
    const { id } = req.params;
    const { vahanCertUrl } = req.body;
    
    const appDoc = await db.collection('applications').doc(id).get();
    const appData = appDoc.exists ? appDoc.data() : null;

    await db.collection('applications').doc(id).update({
      status: 'Certified',
      vahanCertUrl: vahanCertUrl,
      certifiedAt: new Date().toISOString()
    });

    if (appData && appData.userId) {
      await db.collection('notifications').add({
        userId: appData.userId,
        title: 'Certificate Ready',
        message: `Your Vahan Certificate for ${appData.vehicleNo || 'Unknown'} is ready to download.`,
        read: false,
        createdAt: new Date().toISOString()
      });
    }

    res.json({ message: 'Vahan Certificate uploaded successfully' });
  } catch (error) {
    console.error('Error uploading vahan cert:', error);
    res.status(500).json({ error: error.message });
  }
});

// Securely Download Certificate
app.get('/api/applications/:id/download-certificate', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, url: inputUrl } = req.query;

    let fileUrl = (inputUrl && inputUrl !== 'undefined') ? inputUrl : null;
    let filename = `Certificate_${type || 'document'}.pdf`;

    if (id && (!fileUrl || fileUrl === 'undefined')) {
      try {
        const docRef = db.collection('applications').doc(id);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          const appData = docSnap.data();
          fileUrl = type === 'temp' ? appData.tempCertUrl : appData.vahanCertUrl;
          const vehicleNoUpper = (appData.vehicleNo || 'Document').toUpperCase();
          const certType = type === 'temp' ? 'Temp_Certificate' : 'Vahan_Certificate';
          filename = `${vehicleNoUpper}_${certType}.pdf`;
        }
      } catch (dbErr) {
        console.warn('Firestore doc lookup failed in download-certificate, checking cache:', dbErr.message);
        try {
          const cachedApps = await getApplicationsCached();
          const cachedApp = cachedApps.find(a => a.id === id);
          if (cachedApp) {
            fileUrl = type === 'temp' ? cachedApp.tempCertUrl : cachedApp.vahanCertUrl;
            const vehicleNoUpper = (cachedApp.vehicleNo || 'Document').toUpperCase();
            const certType = type === 'temp' ? 'Temp_Certificate' : 'Vahan_Certificate';
            filename = `${vehicleNoUpper}_${certType}.pdf`;
          }
        } catch (cErr) {}
      }
    }

    if (!fileUrl || fileUrl === 'undefined') {
      return res.status(404).json({ error: 'Certificate not available' });
    }

    // Check if it's a B2 URL
    if (fileUrl && (fileUrl.includes('backblazeb2.com') || (process.env.B2_ENDPOINT && fileUrl.includes(process.env.B2_ENDPOINT)))) {
      try {
        let objectKey = fileUrl;
        const bucketName = b2BucketName || 'Vlinkportal';
        
        if (fileUrl.toLowerCase().includes(`/${bucketName.toLowerCase()}/`)) {
          const lowerUrl = fileUrl.toLowerCase();
          const bucketIndex = lowerUrl.indexOf(`/${bucketName.toLowerCase()}/`);
          objectKey = fileUrl.substring(bucketIndex + bucketName.length + 2);
        } else if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
          const parsed = new URL(fileUrl);
          const parts = parsed.pathname.split('/').filter(Boolean);
          if (parts.length > 1) {
            objectKey = parts.slice(parts[0].toLowerCase() === 'file' ? 2 : 1).join('/');
          }
        }

        objectKey = decodeURIComponent(objectKey);

        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: objectKey,
          ResponseContentDisposition: `attachment; filename="${filename}"`
        });
        const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        return res.json({ downloadUrl, filename });
      } catch (b2Err) {
        console.warn('Error generating B2 signed URL, falling back to direct fileUrl:', b2Err.message);
        return res.json({ downloadUrl: fileUrl, filename });
      }
    }

    // Fallback: return original URL (e.g., old Cloudinary or direct URLs)
    res.json({ downloadUrl: fileUrl, filename });

  } catch (error) {
    console.error('Error generating download URL:', error.message);
    res.status(500).json({ error: 'Failed to generate download URL', details: error.message });
  }
});

// Direct Download Proxy Endpoint (forces Content-Disposition: attachment for native browser downloads)
app.get('/api/download-proxy', async (req, res) => {
  try {
    const { id, type, url: inputUrl, filename: inputFilename } = req.query;
    let fileUrl = (inputUrl && inputUrl !== 'undefined') ? inputUrl : null;
    let filename = inputFilename || 'Certificate.pdf';

    // 1. If application ID is provided and fileUrl missing, try Firestore lookup with cache fallback
    if (!fileUrl && id) {
      try {
        const docSnap = await db.collection('applications').doc(id).get();
        if (docSnap.exists) {
          const appData = docSnap.data();
          fileUrl = type === 'temp' ? appData.tempCertUrl : appData.vahanCertUrl;
          const vehicleNoUpper = (appData.vehicleNo || 'Document').toUpperCase();
          const certType = type === 'temp' ? 'Temp_Certificate' : 'Vahan_Certificate';
          if (!inputFilename) {
            filename = `${vehicleNoUpper}_${certType}.pdf`;
          }
        }
      } catch (dbErr) {
        console.warn('Firestore lookup failed in download-proxy, checking cached applications:', dbErr.message);
        try {
          const cachedApps = await getApplicationsCached();
          const cachedApp = cachedApps.find(a => a.id === id);
          if (cachedApp) {
            fileUrl = type === 'temp' ? cachedApp.tempCertUrl : cachedApp.vahanCertUrl;
            const vehicleNoUpper = (cachedApp.vehicleNo || 'Document').toUpperCase();
            const certType = type === 'temp' ? 'Temp_Certificate' : 'Vahan_Certificate';
            if (!inputFilename) {
              filename = `${vehicleNoUpper}_${certType}.pdf`;
            }
          }
        } catch (cErr) {}
      }
    }

    if (!fileUrl || fileUrl === 'undefined') {
      return res.status(404).json({ error: 'Certificate file URL is missing or application not found' });
    }

    let buffer = null;

    // 2. Try fetching from B2 S3 if B2 credentials exist and URL is B2
    if (fileUrl.includes('backblazeb2.com') || (process.env.B2_ENDPOINT && fileUrl.includes(process.env.B2_ENDPOINT))) {
      try {
        let objectKey = fileUrl;
        const bucketName = b2BucketName || 'Vlinkportal';
        if (fileUrl.toLowerCase().includes(`/${bucketName.toLowerCase()}/`)) {
          const lowerUrl = fileUrl.toLowerCase();
          const bucketIndex = lowerUrl.indexOf(`/${bucketName.toLowerCase()}/`);
          objectKey = fileUrl.substring(bucketIndex + bucketName.length + 2);
        } else if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
          const parsed = new URL(fileUrl);
          const parts = parsed.pathname.split('/').filter(Boolean);
          if (parts.length > 1) {
            objectKey = parts.slice(parts[0].toLowerCase() === 'file' ? 2 : 1).join('/');
          }
        }
        objectKey = decodeURIComponent(objectKey);

        const s3Res = await s3Client.send(new GetObjectCommand({
          Bucket: bucketName,
          Key: objectKey
        }));
        const bytes = await s3Res.Body.transformToByteArray();
        buffer = Buffer.from(bytes);
      } catch (s3Err) {
        console.warn('S3 GetObject failed in proxy, falling back to direct fetch:', s3Err.message);
      }
    }

    // 3. Fallback to standard HTTP fetch if buffer not loaded via S3
    if (!buffer) {
      const response = await fetch(fileUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        console.error(`Download proxy fetch error (${response.status}): ${fileUrl}`);
        return res.status(response.status).json({ error: 'Failed to fetch file from source', status: response.status });
      }

      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    // 4. Send binary PDF buffer with Content-Disposition: attachment header
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error('Error in download proxy:', error.message);
    res.status(500).json({ error: 'Failed to download file', details: error.message });
  }
});

// --- SETTINGS ROUTES --- //

// Get Settings (Manufacturers & RTO Offices)
app.get('/api/settings', async (req, res) => {
  try {
    const cachedSettings = cache.get('settings');
    if (cachedSettings && ((cachedSettings.manufacturers && cachedSettings.manufacturers.length > 0) || (cachedSettings.rtoOffices && cachedSettings.rtoOffices.length > 0))) {
      return res.json(cachedSettings);
    }

    const [genDoc, configDoc] = await Promise.all([
      db.collection('settings').doc('general').get(),
      db.collection('settings').doc('config').get()
    ]);
    
    const genData = genDoc.exists ? genDoc.data() : {};
    const configData = configDoc.exists ? configDoc.data() : {};

    const manufacturers = (genData.manufacturers && genData.manufacturers.length > 0)
      ? genData.manufacturers
      : (configData.manufacturers || []);

    const rtoOffices = (genData.rtoOffices && genData.rtoOffices.length > 0)
      ? genData.rtoOffices
      : (configData.rtoOffices || []);

    const result = { manufacturers, rtoOffices };
    if (manufacturers.length > 0 || rtoOffices.length > 0) {
      cache.put('settings', result, 10 * 60 * 1000); // 10 minutes cache
    }
    res.json(result);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Settings
app.put('/api/settings', async (req, res) => {
  try {
    const data = req.body; // { manufacturers: [...], rtoOffices: [...] }
    await Promise.all([
      db.collection('settings').doc('general').set(data, { merge: true }),
      db.collection('settings').doc('config').set(data, { merge: true })
    ]);
    cache.del('settings'); // Invalidate cache so new settings show immediately
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- ORDERS & QUOTA ROUTES --- //

// Get all Users (for Admin dropdown)
app.get('/api/users', async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = [];
    usersSnapshot.forEach(doc => {
      users.push({ id: doc.id, ...doc.data() });
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Order (Quota for 1-Year Validity / Stock)
app.post('/api/orders', requireDb, async (req, res) => {
  try {
    const data = req.body;
    data.createdAt = new Date().toISOString();
    const docRef = await db.collection('orders').add(data);

    // Update device stock in dashboard stats
    const stockRef = db.collection('settings').doc('dashboard');
    const stockDoc = await stockRef.get();
    const currentStock = stockDoc.exists ? (stockDoc.data().deviceStock || 0) : 0;
    await stockRef.set({ deviceStock: currentStock + Number(data.quantity || 0) }, { merge: true });

    if (data.userId) {
      await db.collection('notifications').add({
        userId: data.userId,
        title: 'Stock Added',
        message: `${data.quantity} Stock certificates have been allocated to your account.`,
        read: false,
        createdAt: new Date().toISOString()
      });
    }

    res.json({ id: docRef.id, message: 'Order created successfully' });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Order (Edit)
app.put('/api/orders/:id', requireDb, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // Get old order to adjust device stock
    const oldDoc = await db.collection('orders').doc(id).get();
    if (!oldDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const oldQuantity = Number(oldDoc.data().quantity || 0);
    const newQuantity = Number(data.quantity || 0);

    data.updatedAt = new Date().toISOString();
    await db.collection('orders').doc(id).update(data);

    // Adjust device stock
    const stockRef = db.collection('settings').doc('dashboard');
    const stockDoc = await stockRef.get();
    const currentStock = stockDoc.exists ? (stockDoc.data().deviceStock || 0) : 0;
    await stockRef.set({ deviceStock: currentStock + (newQuantity - oldQuantity) }, { merge: true });

    res.json({ message: 'Order updated successfully' });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete Order
app.delete('/api/orders/:id', requireDb, async (req, res) => {
  try {
    const { id } = req.params;

    // Get order to adjust device stock
    const orderDoc = await db.collection('orders').doc(id).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const quantity = Number(orderDoc.data().quantity || 0);

    await db.collection('orders').doc(id).delete();

    // Reduce device stock
    const stockRef = db.collection('settings').doc('dashboard');
    const stockDoc = await stockRef.get();
    const currentStock = stockDoc.exists ? (stockDoc.data().deviceStock || 0) : 0;
    await stockRef.set({ deviceStock: Math.max(0, currentStock - quantity) }, { merge: true });

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all Orders
app.get('/api/orders', requireDb, async (req, res) => {
  try {
    const snapshot = await db.collection('orders').get();
    const orders = [];
    snapshot.forEach(doc => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    orders.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Orders for a specific User (User Received page)
app.get('/api/orders/user/:uid', requireDb, async (req, res) => {
  try {
    const { uid } = req.params;
    const snapshot = await db.collection('orders').where('userId', '==', uid).get();
    const orders = [];
    snapshot.forEach(doc => {
      orders.push({ id: doc.id, ...doc.data() });
    });

    if (orders.length === 0) {
      const userDoc = await db.collection('users').doc(uid).get();
      if (userDoc.exists && userDoc.data().email) {
        const emailSnap = await db.collection('orders').where('userEmail', '==', userDoc.data().email).get();
        emailSnap.forEach(doc => {
          if (!orders.some(o => o.id === doc.id)) {
            orders.push({ id: doc.id, ...doc.data() });
          }
        });
      }
    }

    // Sort by createdAt descending in memory (avoids composite index requirement)
    orders.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    res.json(orders);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get User Quota (1-Year + 2-Year)
app.get('/api/users/:uid/quota', async (req, res) => {
  try {
    const { uid } = req.params;
    let userEmail = '';
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists && userDoc.data().email) {
      userEmail = userDoc.data().email;
    }

    // 1-Year Quota from Orders
    const ordersSnapshot = await db.collection('orders').get();
    let totalQuota1Year = 0;
    ordersSnapshot.forEach(doc => {
      const d = doc.data();
      if (d.userId === uid || (userEmail && d.userEmail === userEmail)) {
        totalQuota1Year += Number(d.quantity || 0);
      }
    });

    // 2-Year Quota from Subscriptions
    const subsSnapshot = await db.collection('subscriptions').get();
    let totalQuota2Year = 0;
    subsSnapshot.forEach(doc => {
      const d = doc.data();
      if (d.userId === uid || (userEmail && d.userEmail === userEmail)) {
        totalQuota2Year += Number(d.subscriptionCount || 0);
      }
    });

    // Used 1-Year / Received Orders Stock (every application deducts 1 count)
    let used1Year = 0;
    // Used 2-Year / Additional Subscription (2 Years validity applications deduct 1 count)
    let used2Year = 0;
    try {
      const allApps = await getApplicationsCached();
      allApps.forEach(app => {
        if (app.userId === uid || (userEmail && app.userEmail === userEmail)) {
          used1Year++; // Every application deducts 1 from Received Orders Total Stock
          if ((app.validity || '').trim() === '2 Years') {
            used2Year++; // 2 Years validity ALSO deducts 1 from Additional Subscription
          }
        }
      });
    } catch (e) {
      console.warn('Error calculating used quota in /api/users/:uid/quota:', e.message);
    }

    res.json({ 
      totalQuota: totalQuota1Year, 
      usedQuota: used1Year, 
      remainingQuota: Math.max(0, totalQuota1Year - used1Year),
      totalQuota2Year,
      usedQuota2Year: used2Year,
      remainingQuota2Year: Math.max(0, totalQuota2Year - used2Year)
    });
  } catch (error) {
    console.error('Error calculating quota:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- SUBSCRIPTION ROUTES --- //

// Create Subscription (Subscription Quota)
app.post('/api/subscriptions', async (req, res) => {
  try {
    const data = req.body;
    data.createdAt = new Date().toISOString();
    const docRef = await db.collection('subscriptions').add(data);
    
    if (data.userId) {
      await db.collection('notifications').add({
        userId: data.userId,
        title: 'Subscription Added',
        message: `${data.subscriptionCount || data.quantity || 1} Subscriptions have been allocated to your account.`,
        read: false,
        createdAt: new Date().toISOString()
      });
    }

    res.json({ id: docRef.id, message: 'Subscription created successfully' });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all Subscriptions
app.get('/api/subscriptions', async (req, res) => {
  try {
    const snapshot = await db.collection('subscriptions').orderBy('createdAt', 'desc').get();
    const subs = [];
    snapshot.forEach(doc => {
      subs.push({ id: doc.id, ...doc.data() });
    });
    res.json(subs);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Subscription
app.put('/api/subscriptions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    data.updatedAt = new Date().toISOString();
    await db.collection('subscriptions').doc(id).update(data);
    res.json({ message: 'Subscription updated successfully' });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete Subscription
app.delete('/api/subscriptions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('subscriptions').doc(id).delete();
    res.json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Subscriptions for a specific User
app.get('/api/subscriptions/user/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const snapshot = await db.collection('subscriptions').where('userId', '==', uid).get();
    const subs = [];
    snapshot.forEach(doc => {
      subs.push({ id: doc.id, ...doc.data() });
    });

    if (subs.length === 0) {
      const userDoc = await db.collection('users').doc(uid).get();
      if (userDoc.exists && userDoc.data().email) {
        const emailSnap = await db.collection('subscriptions').where('userEmail', '==', userDoc.data().email).get();
        emailSnap.forEach(doc => {
          if (!subs.some(s => s.id === doc.id)) {
            subs.push({ id: doc.id, ...doc.data() });
          }
        });
      }
    }

    subs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    res.json(subs);
  } catch (error) {
    console.error('Error fetching user subscriptions:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- NOTIFICATIONS ROUTES --- //

// Get notifications for a user (or admin if uid = 'admin')
app.get('/api/notifications/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const snapshot = await db.collection('notifications')
      .where('userId', '==', uid)
      .get();
      
    const notifications = [];
    snapshot.forEach(doc => {
      notifications.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort in memory to avoid composite index requirement
    notifications.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    
    // Limit to 20
    const limitedNotifications = notifications.slice(0, 20);
    
    res.json(limitedNotifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('notifications').doc(id).update({ read: true });
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark all notifications as read for a user
app.put('/api/notifications/user/:uid/readAll', async (req, res) => {
  try {
    const { uid } = req.params;
    const snapshot = await db.collection('notifications')
      .where('userId', '==', uid)
      .where('read', '==', false)
      .get();
      
    const batch = db.batch();
    snapshot.forEach(doc => {
      batch.update(doc.ref, { read: true });
    });
    await batch.commit();
    
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy download to force attachment and avoid CORS/dummy pdf issues
app.get('/api/download', async (req, res) => {
  try {
    const { url: fileUrl, filename } = req.query;
    if (!fileUrl) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const response = await fetch(fileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      return res.status(response.status).json({ error: `Failed to fetch file from server (Status: ${response.status})` });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename || 'download'}"`);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
    
    res.send(buffer);
  } catch (error) {
    console.error('Download proxy error:', error);
    res.status(500).json({ error: 'Error downloading file' });
  }
});

// --- Purchase Entries API ---

// Get all purchase entries
app.get('/api/purchase-entries', async (req, res) => {
  try {
    const snapshot = await db.collection('purchaseEntries').orderBy('date', 'desc').get();
    const entries = [];
    snapshot.forEach(doc => {
      entries.push({ id: doc.id, ...doc.data() });
    });
    res.json(entries);
  } catch (error) {
    console.error('Error fetching purchase entries:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get manufacturer stock stats dynamically driven by Settings manufacturers
app.get('/api/stats/manufacturer-stock', async (req, res) => {
  try {
    const [purchaseSnap, orderSnap, settingsDoc] = await Promise.all([
      db.collection('purchaseEntries').get(),
      db.collection('orders').get(),
      db.collection('settings').doc('config').get()
    ]);
    
    let mfgList = [];
    if (settingsDoc.exists && settingsDoc.data().manufacturers) {
      mfgList = settingsDoc.data().manufacturers;
    }

    const stockMap = {};

    // 1. Initialize for manufacturers in Settings
    mfgList.forEach(mfg => {
      const rawMfg = mfg ? String(mfg).trim() : '';
      if (!rawMfg) return;
      const key = rawMfg.replace(/\s+/g, '').toUpperCase();
      if (!stockMap[key]) {
        stockMap[key] = { manufacturer: rawMfg, totalPurchased: 0, totalAllocated: 0, currentStock: 0 };
      }
    });

    // Fallback if mfgList is empty
    if (Object.keys(stockMap).length === 0) {
      purchaseSnap.forEach(doc => {
        const rawMfg = doc.data().manufacturer ? String(doc.data().manufacturer).trim() : '';
        if (!rawMfg) return;
        const key = rawMfg.replace(/\s+/g, '').toUpperCase();
        if (!stockMap[key]) stockMap[key] = { manufacturer: rawMfg, totalPurchased: 0, totalAllocated: 0, currentStock: 0 };
      });
      orderSnap.forEach(doc => {
        const rawMfg = doc.data().item ? String(doc.data().item).trim() : '';
        if (!rawMfg) return;
        const key = rawMfg.replace(/\s+/g, '').toUpperCase();
        if (!stockMap[key]) stockMap[key] = { manufacturer: rawMfg, totalPurchased: 0, totalAllocated: 0, currentStock: 0 };
      });
    }

    // 2. Add up all purchases (incoming stock)
    purchaseSnap.forEach(doc => {
      const data = doc.data();
      const mfg = data.manufacturer ? String(data.manufacturer).replace(/\s+/g, '').toUpperCase() : null;
      const qty = Number(data.quantity) || 0;
      if (mfg && stockMap[mfg]) {
        stockMap[mfg].totalPurchased += qty;
      }
    });
    
    // 3. Subtract all allocations (orders given to users)
    orderSnap.forEach(doc => {
      const data = doc.data();
      const mfg = data.item ? String(data.item).replace(/\s+/g, '').toUpperCase() : null;
      const qty = Number(data.quantity) || 0;
      if (mfg && stockMap[mfg]) {
        stockMap[mfg].totalAllocated += qty;
      }
    });
    
    // 4. Calculate current stock
    for (const mfg in stockMap) {
      stockMap[mfg].currentStock = stockMap[mfg].totalPurchased - stockMap[mfg].totalAllocated;
    }
    
    res.json(stockMap);
  } catch (error) {
    console.error('Error calculating manufacturer stock:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new purchase entry
app.post('/api/purchase-entries', async (req, res) => {
  try {
    const data = req.body;
    data.createdAt = new Date().toISOString();
    const docRef = await db.collection('purchaseEntries').add(data);
    res.status(201).json({ id: docRef.id, message: 'Purchase entry added successfully' });
  } catch (error) {
    console.error('Error adding purchase entry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a purchase entry
app.delete('/api/purchase-entries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('purchaseEntries').doc(id).delete();
    res.json({ message: 'Purchase entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting purchase entry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export the Express API for Vercel
module.exports = app;

// If we are running locally without Vercel CLI, we can start the server
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
