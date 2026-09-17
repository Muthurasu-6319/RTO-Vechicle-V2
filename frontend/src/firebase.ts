import { initializeApp, getApps } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDhVKZerYZOcrYD8-Yg39ZUcgsSa6EQy6U",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "rto-v2.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "rto-v2",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "rto-v2.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "772194039175",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:772194039175:web:d743730f5188574ecf4f22"
};


let app: any;
let storage: any;
let auth: any;
let db: any;

try {
  app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  storage = getStorage(app);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.warn("Firebase initialization warning:", error);
}

export async function createSecondaryUser(email: string, password: string, fullName: string, mobile: string) {
  try {
    const secondaryApp = getApps().find(a => a.name === 'Secondary') || initializeApp(firebaseConfig, 'Secondary');
    const secondaryAuth = getAuth(secondaryApp);
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = userCredential.user.uid;
    await setDoc(doc(db, 'users', uid), {
      uid,
      id: uid,
      fullName,
      mobile,
      email,
      role: 'user',
      createdAt: new Date().toISOString()
    });
    return uid;
  } catch (err) {
    console.error("Client-side user creation error:", err);
    throw err;
  }
}

export { app, storage, auth, db, firebaseConfig };


