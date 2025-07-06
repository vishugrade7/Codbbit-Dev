
import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// This configuration will use Application Default Credentials
// when running on Google Cloud infrastructure (like App Hosting).
// For local development, it would require a service account key file.
if (!getApps().length) {
  // More robust way to get Project ID on the server, using GCLOUD_PROJECT as the primary source
  const projectId = process.env.GCLOUD_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    // This will help in debugging if the project ID is still not found.
    console.error("Firebase Admin Init Error: Project ID could not be determined. Check GCLOUD_PROJECT or NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variables.");
  }

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    storageBucket: projectId ? `${projectId}.appspot.com` : undefined,
  });
}

export const adminDb = admin.firestore();
export const adminStorage = admin.storage();
