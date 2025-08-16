
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  "projectId": "showcase-canvas-rx61p",
  "appId": "1:408120069857:web:6cd5331d496145beb3b1a0",
  "storageBucket": "showcase-canvas-rx61p.appspot.com",
  "apiKey": "AIzaSyCoQTrq-kldgLibBYKFf4syhrGArLmmu9g",
  "authDomain": "showcase-canvas-rx61p.firebaseapp.com",
  "messagingSenderId": "408120069857"
};

// Initialize Firebase
// Guard against missing config
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("REPLACE_WITH")) {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
} else {
    if (typeof window !== 'undefined') {
        console.warn("Firebase config not found or is using placeholder values. Firebase features will be disabled. Please check your .env file.");
    }
}

export { app, auth, db, storage };
