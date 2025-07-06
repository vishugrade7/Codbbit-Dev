
import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// This configuration will use Application Default Credentials
// when running on Google Cloud infrastructure (like App Hosting).
// For local development, it would require a service account key file.
if (!getApps().length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

export const adminDb = admin.firestore();
export const adminStorage = admin.storage();
