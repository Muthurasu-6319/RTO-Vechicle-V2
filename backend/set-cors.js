const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
require('dotenv').config();

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  })
});

async function configureCors() {
  try {
    const bucket = getStorage().bucket('rto-v2.firebasestorage.app');
    
    await bucket.setCorsConfiguration([
      {
        origin: ['*'],
        method: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
        responseHeader: ['Content-Type', 'Authorization', 'Content-Length', 'User-Agent', 'x-goog-resumable'],
        maxAgeSeconds: 3600
      }
    ]);
    console.log('CORS configured successfully for Firebase Storage!');
  } catch (error) {
    console.error('Failed to configure CORS:', error);
  }
}

configureCors();
