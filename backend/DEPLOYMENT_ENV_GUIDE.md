# Vercel Deployment & Environment Variables Guide

## Why Admin Portal was showing 0 data:
The Express Backend (`backend/api/index.js`) requires Firebase Admin Service Account credentials to communicate with Firebase Authentication and Firestore on the server side.

When deploying to Vercel (or running backend locally), you MUST set these 3 environment variables in Vercel Project Settings (`Settings` -> `Environment Variables`):

```env
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

---

## How to get Firebase Private Key & Service Account Credentials:
1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Click **Project Settings** (gear icon) -> **Service accounts**.
3. Click **Generate new private key** -> Download the JSON file.
4. From the downloaded JSON file:
   - `project_id` $\rightarrow$ `FIREBASE_PROJECT_ID`
   - `client_email` $\rightarrow$ `FIREBASE_CLIENT_EMAIL`
   - `private_key` $\rightarrow$ `FIREBASE_PRIVATE_KEY` (copy entire string including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`).

---

## Direct Client-Side Fallback Active:
In the frontend Admin pages, we have now implemented an automatic **Client-Side Firestore Fallback**. Even if the backend environment variables are missing or backend is down:
- Admin Dashboard counts (`users`, `applications`, `orders`, `subscriptions`) are fetched directly from Firestore.
- Admin User Management fetches users directly from Firestore.
- User Creation (`/admin/users`) uses a secondary client-side Firebase Auth instance + Firestore document so created users **can immediately log in!**
