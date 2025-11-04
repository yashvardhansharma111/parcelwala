/**
 * Firebase Initialization Utility
 * Shared Firebase app and Firestore instance initialization
 */

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { AppConfig } from "../config";

// Lazy initialization - only initialize when needed
let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export const getFirebaseApp = (): FirebaseApp => {
  if (!app) {
    if (getApps().length === 0) {
      app = initializeApp(AppConfig.firebase);
    } else {
      app = getApps()[0];
    }
  }
  return app;
};

export const getFirestoreInstance = (): Firestore => {
  if (!db) {
    const firebaseApp = getFirebaseApp();
    db = getFirestore(firebaseApp);
  }
  return db;
};

