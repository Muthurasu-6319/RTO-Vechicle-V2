const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config({ path: 'd:/RTO Portal V2/backend/.env' });

let privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (privateKey) {
  privateKey = privateKey.replace(/^"|"$/g, ''); 
  privateKey = privateKey.replace(/\\n/g, '\n'); 
}
let projectId = process.env.FIREBASE_PROJECT_ID;
if (projectId) projectId = projectId.replace(/^"|"$/g, ''); 
let clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
if (clientEmail) clientEmail = clientEmail.replace(/^"|"$/g, ''); 

initializeApp({
  credential: cert({ projectId, privateKey, clientEmail })
});

const db = getFirestore();

async function resetAll() {
  console.log('Resetting applications...');
  const apps = await db.collection('applications').get();
  for (const doc of apps.docs) {
    await doc.ref.delete();
  }
  
  console.log('Resetting orders...');
  const orders = await db.collection('orders').get();
  for (const doc of orders.docs) {
    await doc.ref.delete();
  }

  console.log('Resetting purchase entries...');
  const purchases = await db.collection('purchaseEntries').get();
  for (const doc of purchases.docs) {
    await doc.ref.delete();
  }
  
  console.log('Resetting device stock to 0...');
  await db.collection('settings').doc('dashboard').set({ deviceStock: 0 }, { merge: true });

  console.log('All reset to 0.');
}

resetAll().catch(console.error);
