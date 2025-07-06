
import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// This configuration will use Application Default Credentials
// when running on Google Cloud infrastructure (like App Hosting).
// For local development, it would require a service account key file.
if (!getApps().length) {
  // Directly using the known project ID to construct the bucket name.
  // This is the most reliable way to ensure the correct bucket is targeted.
  const bucketName = 'showcase-canvas-rx61p.appspot.com';

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    storageBucket: bucketName,
  });
}

export const adminDb = admin.firestore();
export const adminStorage = admin.storage();
