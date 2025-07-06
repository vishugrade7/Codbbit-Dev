
import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// This configuration will use Application Default Credentials
// when running on Google Cloud infrastructure (like App Hosting).
// For local development, it would require a service account key file.
if (!getApps().length) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    storageBucket: projectId ? `${projectId}.appspot.com` : undefined,
  });
}

export const adminDb = admin.firestore();
export const adminStorage = admin.storage();
