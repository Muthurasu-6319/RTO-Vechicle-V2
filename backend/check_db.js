const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config({ path: 'd:/RTO Portal V2/backend/.env' });

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function check() {
  const apps = await db.collection('applications').get();
  console.log('Total applications:', apps.size);
  apps.forEach(doc => {
    console.log(doc.id, '=>', doc.data().status);
  });
}

check();
