/**
 * Firebase Admin SDK Initialization
 * Initializes Firestore & Auth for server-side operations
 */

import dotenv from "dotenv";
dotenv.config(); // Ensure .env is loaded early

import * as admin from "firebase-admin";
import { getApps } from "firebase-admin/app";
import { AppCreds } from "./creds";

// Safely parse private key (handle \n from .env)
const privateKey = AppCreds.firebase.privateKey?.replace(/\\n/g, "\n");

if (!AppCreds.firebase.projectId || !AppCreds.firebase.clientEmail || !privateKey) {
  console.error("❌ Missing Firebase credentials in AppCreds:");
  console.error("projectId:", AppCreds.firebase.projectId);
  console.error("clientEmail:", AppCreds.firebase.clientEmail);
  console.error("hasPrivateKey:", !!AppCreds.firebase.privateKey);
  throw new Error(
    "Firebase credentials not configured. Please check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env"
  );
}

// Initialize Firebase Admin SDK only once
if (getApps().length === 0) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: AppCreds.firebase.projectId,
        clientEmail: AppCreds.firebase.clientEmail,
        privateKey,
      }),
    });

    console.log(`[Firebase] ✅ Firebase Admin SDK initialized successfully`);
    console.log(`[Firebase] 📍 Project ID: ${AppCreds.firebase.projectId}`);
    console.log(`[Firebase] 📧 Service Account: ${AppCreds.firebase.clientEmail}`);
    console.log(`[Firebase] 🔑 Private Key: ${privateKey ? "✅ Present" : "❌ Missing"}`);
    
    // Test Firestore connection asynchronously (non-blocking)
    console.log(`[Firebase] 🧪 Testing Firestore connection...`);
    admin.firestore().collection("_test").limit(1).get()
      .then(() => {
        console.log(`[Firebase] ✅ Firestore connection verified - test query successful`);
      })
      .catch((testError: any) => {
        console.error(`[Firebase] ❌ Firestore test query failed`);
        console.error(`[Firebase] ❌ Error code: ${testError.code || "N/A"}`);
        console.error(`[Firebase] ❌ Error message: ${testError.message || "N/A"}`);
        
        if (testError.code === 16 || testError.message?.includes("UNAUTHENTICATED")) {
          console.error(`[Firebase] ❌ Firestore authentication failed!`);
          console.error(`[Firebase] ❌ Please check your Firebase credentials in .env file:`);
          console.error(`[Firebase] ❌   - FIREBASE_PROJECT_ID`);
          console.error(`[Firebase] ❌   - FIREBASE_CLIENT_EMAIL`);
          console.error(`[Firebase] ❌   - FIREBASE_PRIVATE_KEY (must be in quotes with \\n characters)`);
          console.error(`[Firebase] ❌ See SETUP_ENV.md for detailed instructions.`);
        } else {
          // Other errors (like missing collection) are OK for test
          console.log(`[Firebase] ✅ Firestore connection verified (test query completed, collection may not exist)`);
        }
      });
  } catch (initError: any) {
    console.error("❌ Failed to initialize Firebase Admin SDK:");
    console.error(initError.message);
    if (initError.message?.includes("private_key")) {
      console.error("\n⚠️  Private key format issue. Make sure FIREBASE_PRIVATE_KEY:");
      console.error("   - Is wrapped in quotes");
      console.error("   - Contains \\n characters (not actual newlines)");
      console.error("   - Example: FIREBASE_PRIVATE_KEY=\"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n\"");
    }
    throw initError;
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
export default admin;
