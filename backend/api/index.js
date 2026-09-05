const express = require('express');
const cors = require('cors');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const cloudinary = require('cloudinary').v2;
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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

// Basic API Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'success', 
    message: 'RTO Portal V2 Backend is running successfully on Vercel!',
    firebaseStatus: db ? 'Connected' : 'Failed',
    firebaseError: firebaseInitError
  });
});

// Cloudinary Signature Route
app.get('/api/cloudinary/sign', (req, res) => {
  const timestamp = Math.round((new Date).getTime() / 1000);
  // Optional folder parameter
  const folder = req.query.folder || 'documents';
  
  const signature = cloudinary.utils.api_sign_request({
    timestamp: timestamp,
    folder: folder,
    use_filename: 'true',
    unique_filename: 'false'
  }, process.env.CLOUDINARY_API_SECRET);

  res.json({ timestamp, signature, folder, use_filename: 'true', unique_filename: 'false' });
});

// Gemini OCR Route
app.post('/api/scan-barcode', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: 'No image URL provided' });

    // Download the image
    const imageResp = await fetch(imageUrl);
    const arrayBuffer = await imageResp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = imageResp.headers.get('content-type') || 'image/jpeg';

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `Extract the IMEI number (typically 15 digits) and the VLD Serial Number (typically alphanumeric starting with VLD or similar) from this image. 
    Return ONLY a valid JSON object without any markdown formatting or extra text. 
    Example format: {"imei": "123456789012345", "vldSerial": "VLD-1234-XYZ"}`;

    const imageParts = [
      {
        inlineData: {
          data: buffer.toString("base64"),
          mimeType
        }
      }
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    const responseText = result.response.text();
    
    // Clean up potential markdown wrapper from response
    const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(jsonStr);

    res.json(parsedData);
  } catch (error) {
    console.error('OCR Error:', error);
    res.status(500).json({ error: 'Failed to extract data from image' });
  }
});

// Admin Authentication Route
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // 1. Check Hardcoded Superadmin Fallback
    if (email === 'admin@gmail.com' && password === 'admin') {
      return res.json({ token: 'mock-jwt-token-for-admin', role: 'full admin', manufacturer: '' });
    }

    // 2. Check Database for Admin Users
    const adminsRef = db.collection('admins');
    const snapshot = await adminsRef.where('email', '==', email).get();

    if (snapshot.empty) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    let validAdmin = null;
    snapshot.forEach(doc => {
      const adminData = doc.data();
      // In a real app, use bcrypt. Here we use plain text for simplicity as per current pattern
      if (adminData.password === password) {
        validAdmin = { id: doc.id, ...adminData };
      }
    });

    if (validAdmin) {
      res.json({ 
        token: 'mock-jwt-token-for-admin-' + validAdmin.id, 
        role: validAdmin.role, 
        manufacturer: validAdmin.manufacturer 
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- ADMIN MANAGEMENT ROUTES --- //

app.post('/api/admins', async (req, res) => {
  try {
    const data = req.body;
    data.createdAt = new Date().toISOString();
    const docRef = await db.collection('admins').add(data);
    res.status(201).json({ message: 'Admin created successfully', id: docRef.id });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admins', async (req, res) => {
  try {
    const snapshot = await db.collection('admins').orderBy('createdAt', 'desc').get();
    const admins = [];
    snapshot.forEach(doc => {
      admins.push({ id: doc.id, ...doc.data() });
    });
    res.json(admins);
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admins/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    await db.collection('admins').doc(id).update(data);
    res.json({ message: 'Admin updated successfully' });
  } catch (error) {
    console.error('Error updating admin:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admins/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('admins').doc(id).delete();
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
    const usersSnapshot = await db.collection('users').count().get();
    const totalUsers = usersSnapshot.data().count;

    const appsSnapshot = await db.collection('applications').count().get();
    const totalApps = appsSnapshot.data().count;

    const pendingSnapshot = await db.collection('applications').where('status', '==', 'Pending').count().get();
    const pendingApps = pendingSnapshot.data().count;

    const certifiedSnapshot = await db.collection('applications').where('status', '==', 'Approved').count().get();
    const certifiedApps = certifiedSnapshot.data().count;

    const ordersSnapshot = await db.collection('orders').count().get();
    const totalOrders = ordersSnapshot.data().count;

    // Get device stock from settings
    const stockDoc = await db.collection('settings').doc('dashboard').get();
    const deviceStock = stockDoc.exists ? (stockDoc.data().deviceStock || 0) : 0;

    res.json({
      totalUsers: totalUsers,
      applications: totalApps,
      pendingReview: pendingApps,
      certificatesIssued: certifiedApps,
      totalOrders: totalOrders,
      deviceStock: deviceStock,
      subscriptions: 0
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- APPLICATIONS ROUTES --- //

// Check if IMEI, VLD S.No, or Vehicle No already exists
app.post('/api/applications/check-unique', async (req, res) => {
  try {
    const { imei, vldSerial, vehicleNo } = req.body;
    const result = { imeiExists: false, vldExists: false, vehicleExists: false };

    if (imei) {
      const imeiSnap = await db.collection('applications').where('imei', '==', imei).get();
      result.imeiExists = !imeiSnap.empty;
    }
    if (vldSerial) {
      const vldSnap = await db.collection('applications').where('vldSerial', '==', vldSerial).get();
      result.vldExists = !vldSnap.empty;
    }
    if (vehicleNo) {
      const vehicleSnap = await db.collection('applications').where('vehicleNo', '==', vehicleNo).get();
      result.vehicleExists = !vehicleSnap.empty;
    }

    res.json(result);
  } catch (error) {
    console.error('Error checking uniqueness:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Application (User)
app.post('/api/applications', async (req, res) => {
  try {
    const data = req.body;
    
    // Check if IMEI already exists
    const imeiSnapshot = await db.collection('applications').where('imei', '==', data.imei).get();
    if (!imeiSnapshot.empty) {
      return res.status(400).json({ error: 'This IMEI number has already been registered.' });
    }

    // Check if VLD Serial already exists
    const vldSnapshot = await db.collection('applications').where('vldSerial', '==', data.vldSerial).get();
    if (!vldSnapshot.empty) {
      return res.status(400).json({ error: 'This VLD S.No has already been registered.' });
    }

    data.status = 'Pending';
    data.createdAt = new Date().toISOString();
    
    const docRef = await db.collection('applications').add(data);
    
    // Trigger Admin Notification
    await db.collection('notifications').add({
      userId: 'admin', // send to all admins or a generic admin inbox
      title: 'New Application Received',
      message: `A new certificate application has been submitted for vehicle ${data.vehicleNo}.`,
      read: false,
      createdAt: new Date().toISOString()
    });

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
    let query = db.collection('applications').orderBy('createdAt', 'desc');

    const snapshot = await query.get();
    const applications = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      // Filter in memory
      if (manufacturer && data.manufacturer !== manufacturer) return;
      if (userId && data.userId !== userId) return;
      
      applications.push({ id: doc.id, ...data });
    });
    
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

    if (appData && appData.userId) {
      await db.collection('notifications').add({
        userId: appData.userId,
        title: 'Application Approved',
        message: `Your application for vehicle ${appData.vehicleNo || 'Unknown'} has been approved!`,
        read: false,
        createdAt: new Date().toISOString()
      });
    }

    res.json({ message: 'Application moved to Installed successfully' });
  } catch (error) {
    console.error('Error approving application:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin Uploads Temp Certificate
app.put('/api/applications/:id/temp-cert', async (req, res) => {
  try {
    const { id } = req.params;
    const { tempCertUrl } = req.body;
    await db.collection('applications').doc(id).update({
      status: 'TempCertUploaded',
      tempCertUrl: tempCertUrl,
      tempCertUploadedAt: new Date().toISOString()
    });
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
    res.json({ message: 'RTO Approved successfully' });
  } catch (error) {
    console.error('Error RTO approving:', error);
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

// Securely Download Certificate without exposing Cloudinary URL
app.get('/api/applications/:id/download-certificate', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, type } = req.query; // type can be 'temp' or 'vahan'

    const docRef = db.collection('applications').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const appData = docSnap.data();

    // Determine which URL to use based on type
    let cloudinaryUrl = appData.vahanCertUrl;
    let fileNamePrefix = 'Vahan_Certificate';
    
    if (type === 'temp') {
      cloudinaryUrl = appData.tempCertUrl;
      fileNamePrefix = 'Temp_Certificate';
    }

    if (!cloudinaryUrl) {
      return res.status(404).json({ error: 'Certificate not available' });
    }

    // Fetch from Cloudinary
    const fetchResponse = await fetch(cloudinaryUrl);
    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text();
      throw new Error(`Cloudinary Error: ${fetchResponse.status} ${fetchResponse.statusText} | URL: ${cloudinaryUrl} | Body: ${errorText}`);
    }

    const contentType = fetchResponse.headers.get('content-type') || 'application/pdf';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileNamePrefix}_${appData.vehicleNo || 'Document'}.pdf"`);

    // Stream the response to the client
    const buffer = await fetchResponse.arrayBuffer();
    res.send(Buffer.from(buffer));

  } catch (error) {
    console.error('Error downloading certificate securely:', error);
    res.status(500).json({ error: 'Failed to download securely', details: error.message, stack: error.stack });
  }
});

// --- SETTINGS ROUTES --- //

// Get Settings (Manufacturers & RTO Offices)
app.get('/api/settings', async (req, res) => {
  try {
    const docRef = db.collection('settings').doc('general');
    const doc = await docRef.get();
    
    if (!doc.exists) {
      // Return default if not exists
      return res.json({ manufacturers: [], rtoOffices: [] });
    }
    
    res.json(doc.data());
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Settings
app.put('/api/settings', async (req, res) => {
  try {
    const data = req.body; // { manufacturers: [...], rtoOffices: [...] }
    const docRef = db.collection('settings').doc('general');
    await docRef.set(data, { merge: true });
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
app.post('/api/orders', async (req, res) => {
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
app.put('/api/orders/:id', async (req, res) => {
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
app.delete('/api/orders/:id', async (req, res) => {
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
app.get('/api/orders', async (req, res) => {
  try {
    const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
    const orders = [];
    snapshot.forEach(doc => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Orders for a specific User (User Received page)
app.get('/api/orders/user/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const snapshot = await db.collection('orders').where('userId', '==', uid).get();
    const orders = [];
    snapshot.forEach(doc => {
      orders.push({ id: doc.id, ...doc.data() });
    });
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

    // 1-Year Quota from Orders
    const ordersSnapshot = await db.collection('orders').where('userId', '==', uid).get();
    let totalQuota1Year = 0;
    ordersSnapshot.forEach(doc => {
      totalQuota1Year += Number(doc.data().quantity || 0);
    });

    // 2-Year Quota from Subscriptions
    const subsSnapshot = await db.collection('subscriptions').where('userId', '==', uid).get();
    let totalQuota2Year = 0;
    subsSnapshot.forEach(doc => {
      totalQuota2Year += Number(doc.data().subscriptionCount || 0);
    });

    // Used 1-Year (applications with validity '1 Year')
    let used1Year = 0;
    try {
      const apps1 = await db.collection('applications').where('userId', '==', uid).get();
      apps1.forEach(doc => {
        if (doc.data().validity === '1 Year') used1Year++;
      });
    } catch (e) { /* ignore index errors */ }

    // Used 2-Year (applications with validity '2 Years')
    let used2Year = 0;
    try {
      const apps2 = await db.collection('applications').where('userId', '==', uid).get();
      apps2.forEach(doc => {
        if (doc.data().validity === '2 Years') used2Year++;
      });
    } catch (e) { /* ignore index errors */ }

    res.json({ 
      totalQuota: totalQuota1Year, 
      usedQuota: used1Year, 
      remainingQuota: totalQuota1Year - used1Year,
      totalQuota2Year,
      usedQuota2Year: used2Year,
      remainingQuota2Year: totalQuota2Year - used2Year
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

// Export the Express API for Vercel
module.exports = app;

// If we are running locally without Vercel CLI, we can start the server
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
