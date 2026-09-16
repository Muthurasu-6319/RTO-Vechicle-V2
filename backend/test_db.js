require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

async function checkDatabase() {
  try {
    console.log("Checking Database Connection...");
    
    // Parse the private key properly
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey) {
      privateKey = privateKey.replace(/^"|"$/g, '');
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      })
    });

    const db = getFirestore();
    console.log(`Connected to Firebase Project: ${process.env.FIREBASE_PROJECT_ID}`);
    
    console.log("Attempting to read 1 record from 'users' collection...");
    const usersSnap = await db.collection('users').limit(1).get();
    console.log(`Successfully read ${usersSnap.size} user document(s).`);
    
    console.log("Attempting to read 1 record from 'applications' collection...");
    const appsSnap = await db.collection('applications').limit(1).get();
    console.log(`Successfully read ${appsSnap.size} application document(s).`);
    
    console.log("✅ SUCCESS: Database is accessible and quota has reset/is available.");

  } catch (error) {
    console.error("❌ ERROR ACCESSING DATABASE:");
    console.error(error.message);
    if (error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('Quota exceeded')) {
      console.log("\n⚠️ Firebase Quota limit is still blocking access.");
    }
  }
}

checkDatabase();
