/**
 * User Service
 * Handles Firestore user operations
 */

import * as admin from "firebase-admin";
import { db } from "../config/firebase";
import { AppCreds } from "../config/creds";
import { createError } from "../utils/errorHandler";

export interface User {
  id: string;
  phoneNumber: string;
  name?: string; // User's name
  role: "admin" | "customer";
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Determine user role based on phone number
 * Hardcoded super admin phone number: 8462044151
 */
export const determineRole = (phoneNumber: string): "admin" | "customer" => {
  // Hardcoded super admin phone number
  const SUPER_ADMIN_PHONE = "8462044151";
  
  // Normalize phone numbers for comparison
  const normalizePhone = (phone: string): string => {
    if (!phone) return "";
    // Remove all spaces, +, -, and country code
    let normalized = phone.trim().replace(/\s+/g, "").replace(/[+\-]/g, "");
    // Remove +91 or 91 prefix if present
    if (normalized.startsWith("91") && normalized.length === 12) {
      normalized = normalized.substring(2);
    }
    return normalized;
  };
  
  const normalizedUserPhone = normalizePhone(phoneNumber);
  const normalizedSuperAdminPhone = normalizePhone(SUPER_ADMIN_PHONE);
  
  return normalizedUserPhone === normalizedSuperAdminPhone ? "admin" : "customer";
};

/**
 * Create or get user in Firestore
 */
export const createOrGetUser = async (
  phoneNumber: string,
  name?: string
): Promise<User> => {
  try {
    console.log(`[Firebase] 🔄 Creating or getting user: phone=${phoneNumber}, name=${name || "N/A"}`);
    
    // Determine role
    const role = determineRole(phoneNumber);
    console.log(`[Firebase] 👤 Determined role: ${role}`);

    // Try to find existing user by phone number
    console.log(`[Firebase] 🔍 Checking if user exists...`);
    const usersRef = db.collection("users");
    const queryStartTime = Date.now();
    let snapshot;
    try {
      snapshot = await usersRef.where("phoneNumber", "==", phoneNumber).limit(1).get();
    } catch (queryError: any) {
      // If collection doesn't exist, Firestore might throw NOT_FOUND
      // This is OK - it means no users exist yet, we'll create the first one
      if (queryError.code === 5 || queryError.message?.includes("NOT_FOUND")) {
        console.log(`[Firebase] ℹ️  Collection may not exist yet (code 5) - will create first user`);
        console.log(`[Firebase] ℹ️  This is normal for new databases.`);
        // Set snapshot to empty to proceed with user creation
        snapshot = { empty: true, docs: [], size: 0 } as any;
      } else {
        throw queryError; // Re-throw other errors
      }
    }
    const queryTime = Date.now() - queryStartTime;
    console.log(`[Firebase] ✅ User check completed in ${queryTime}ms, found: ${snapshot.empty ? "no" : "yes"}`);

    let userData: User;
    const now = new Date();

    if (!snapshot.empty) {
      // User exists, update it
      console.log(`[Firebase] 👤 User exists, updating...`);
      const doc = snapshot.docs[0];
      const data = doc.data();

      userData = {
        id: doc.id,
        phoneNumber,
        name: name || data.name, // Update name if provided, otherwise keep existing
        role: data.role || role,
        refreshToken: data.refreshToken,
        createdAt: data.createdAt?.toDate() || now,
        updatedAt: now,
      };

      // Update user document (only update name if provided)
      const updateData: any = {
        role: userData.role,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (name) {
        updateData.name = name;
      }
      
      console.log(`[Firebase] 📝 Updating user document: ID=${doc.id}, data=`, updateData);
      const updateStartTime = Date.now();
      await doc.ref.update(updateData);
      const updateTime = Date.now() - updateStartTime;
      console.log(`[Firebase] ✅ User updated successfully in ${updateTime}ms`);
    } else {
      // User doesn't exist, create new
      console.log(`[Firebase] ➕ User doesn't exist, creating new user...`);
      
      // Name is required for new users
      if (!name || name.trim().length === 0) {
        console.error(`[Firebase] ❌ Name is required for new users but was not provided`);
        throw createError("Name is required for new users", 400);
      }

      const newUserRef = usersRef.doc();
      userData = {
        id: newUserRef.id,
        phoneNumber,
        name: name.trim(),
        role,
        createdAt: now,
        updatedAt: now,
      };

      const userDataToSave = {
        phoneNumber: userData.phoneNumber,
        name: userData.name,
        role: userData.role,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      console.log(`[Firebase] 📝 Creating new user document: ID=${newUserRef.id}`);
      console.log(`[Firebase] 📝 User data to save:`, {
        phoneNumber: userDataToSave.phoneNumber,
        name: userDataToSave.name,
        role: userDataToSave.role,
        createdAt: "serverTimestamp()",
        updatedAt: "serverTimestamp()"
      });
      
      const createStartTime = Date.now();
      await newUserRef.set(userDataToSave);
      const createTime = Date.now() - createStartTime;
      console.log(`[Firebase] ✅ User created successfully in ${createTime}ms: ID=${newUserRef.id}`);
    }

    console.log(`[Firebase] ✅ Successfully created/retrieved user: ID=${userData.id}, Phone=${userData.phoneNumber}`);
    return userData;
  } catch (error: any) {
    console.error(`[Firebase] ❌ ERROR creating/getting user: phone=${phoneNumber}, name=${name || "N/A"}`);
    console.error(`[Firebase] ❌ Error code: ${error.code || "N/A"}`);
    console.error(`[Firebase] ❌ Error name: ${error.name || "N/A"}`);
    console.error(`[Firebase] ❌ Error message: ${error.message || "N/A"}`);
    console.error(`[Firebase] ❌ Error stack: ${error.stack || "N/A"}`);
    console.error(`[Firebase] ❌ Full error details:`, JSON.stringify(error, null, 2));
    
    // If it's already a createError, re-throw it
    if (error.statusCode) {
      console.error(`[Firebase] ❌ Re-throwing existing error with statusCode: ${error.statusCode}`);
      throw error;
    }
    
    // Firestore errors
    if (error.code === 5 || error.message?.includes("NOT_FOUND")) {
      // NOT_FOUND during query is OK (user doesn't exist), but if it happens during write, it's a problem
      // If we're here, it means the write operation failed
      console.error(`[Firebase] ❌ Firestore NOT_FOUND error (code 5) during user creation!`);
      console.error(`[Firebase] ❌ This might mean the collection doesn't exist or there's a permission issue.`);
      console.error(`[Firebase] ❌ Collection: users, Operation: create/update`);
      throw createError("Failed to create user account. Please try again.", 500);
    }
    
    if (error.code === 7 || error.message?.includes("PERMISSION_DENIED")) {
      console.error(`[Firebase] ❌ Firestore PERMISSION_DENIED error (code 7) when creating user!`);
      console.error(`[Firebase] ❌ The service account does not have write permission.`);
      console.error(`[Firebase] ❌ Check Firestore security rules and service account IAM permissions.`);
      throw createError("Permission denied. Cannot create user account.", 500);
    }
    
    if (error.code === 16 || error.message?.includes("UNAUTHENTICATED")) {
      console.error(`[Firebase] ❌ Firebase UNAUTHENTICATED error (code 16) when creating user!`);
      console.error(`[Firebase] ❌ The backend cannot authenticate with Firestore.`);
      console.error(`[Firebase] ❌ Check Firebase credentials in .env file.`);
      throw createError("Firebase authentication failed. Please check backend configuration.", 500);
    }
    
    console.error(`[Firebase] ❌ Unknown Firebase error, throwing generic error`);
    throw createError(`Failed to create or get user: ${error.message || "Unknown error"}`, 500);
  }
};

/**
 * Update user refresh token
 */
export const updateRefreshToken = async (
  userId: string,
  refreshToken: string
): Promise<void> => {
  try {
    await db.collection("users").doc(userId).update({
      refreshToken,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error: any) {
    console.error("Error updating refresh token:", error);
    throw createError("Failed to update refresh token", 500);
  }
};

/**
 * Remove refresh token (logout)
 */
export const removeRefreshToken = async (userId: string): Promise<void> => {
  try {
    await db.collection("users").doc(userId).update({
      refreshToken: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error: any) {
    console.error("Error removing refresh token:", error);
    throw createError("Failed to remove refresh token", 500);
  }
};

/**
 * Get user by phone number
 */
export const getUserByPhoneNumber = async (phoneNumber: string): Promise<User | null> => {
  try {
    console.log(`[Firebase] 🔍 Getting user by phone number: ${phoneNumber}`);
    console.log(`[Firebase] 📍 Collection: users`);
    console.log(`[Firebase] 🔎 Query: where("phoneNumber", "==", "${phoneNumber}")`);
    
    const usersRef = db.collection("users");
    const startTime = Date.now();
    
    console.log(`[Firebase] ⏳ Executing Firestore query...`);
    let snapshot;
    try {
      snapshot = await usersRef.where("phoneNumber", "==", phoneNumber).limit(1).get();
    } catch (queryError: any) {
      // If collection doesn't exist, Firestore might throw NOT_FOUND
      // This is OK - it means no users exist yet
      if (queryError.code === 5 || queryError.message?.includes("NOT_FOUND")) {
        console.log(`[Firebase] ℹ️  Collection may not exist yet (code 5) - treating as empty result`);
        console.log(`[Firebase] ℹ️  This is normal for new databases. User will be created.`);
        return null;
      }
      throw queryError; // Re-throw other errors
    }
    const queryTime = Date.now() - startTime;
    
    console.log(`[Firebase] ✅ Query completed in ${queryTime}ms`);
    console.log(`[Firebase] 📊 Query result: ${snapshot.empty ? "empty (user not found)" : `found ${snapshot.size} document(s)`}`);

    if (snapshot.empty) {
      console.log(`[Firebase] ℹ️  User not found for phone: ${phoneNumber} (this is normal for new users)`);
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    
    console.log(`[Firebase] ✅ User found: ID=${doc.id}, Name=${data.name || "N/A"}, Role=${data.role || "N/A"}`);
    
    return {
      id: doc.id,
      phoneNumber: data.phoneNumber,
      name: data.name,
      role: data.role,
      refreshToken: data.refreshToken,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  } catch (error: any) {
    console.error(`[Firebase] ❌ ERROR getting user by phone number: ${phoneNumber}`);
    console.error(`[Firebase] ❌ Error code: ${error.code}`);
    console.error(`[Firebase] ❌ Error message: ${error.message}`);
    console.error(`[Firebase] ❌ Error name: ${error.name || "N/A"}`);
    console.error(`[Firebase] ❌ Error stack: ${error.stack || "N/A"}`);
    console.error(`[Firebase] ❌ Full error details:`, JSON.stringify(error, null, 2));
    
    // NOT_FOUND (code 5) - User doesn't exist, return null (this is normal for new users)
    if (error.code === 5 || error.message?.includes("NOT_FOUND")) {
      console.log(`[Firebase] ℹ️  User not found (code 5) - returning null (normal for new users)`);
      return null; // Return null instead of throwing error
    }
    
    // Provide more specific error messages
    if (error.code === 16 || error.message?.includes("UNAUTHENTICATED")) {
      console.error("❌ Firebase authentication error!");
      console.error("The backend cannot authenticate with Firestore.");
      console.error("Please check your .env file in the backend directory:");
      console.error("  - FIREBASE_PROJECT_ID");
      console.error("  - FIREBASE_CLIENT_EMAIL");
      console.error("  - FIREBASE_PRIVATE_KEY");
      console.error("\nSee backend/SETUP_ENV.md for setup instructions.");
      throw createError("Firebase authentication failed. Please check backend .env configuration.", 500);
    }
    
    // Network/connectivity errors
    if (error.code === 14 || error.message?.includes("UNAVAILABLE") || error.message?.includes("DEADLINE_EXCEEDED")) {
      console.error("❌ Firestore connection error!");
      console.error("The backend cannot reach Firestore servers.");
      console.error("Check network connectivity from VPS to Firebase.");
      throw createError("Firestore connection failed. Please check network connectivity.", 500);
    }
    
    // Permission errors
    if (error.code === 7 || error.message?.includes("PERMISSION_DENIED")) {
      console.error("❌ Firestore permission error!");
      console.error("The service account does not have permission to read from Firestore.");
      console.error("Check Firestore security rules and service account permissions.");
      throw createError("Firestore permission denied. Please check service account permissions.", 500);
    }
    
    throw createError(`Failed to get user: ${error.message || "Unknown error"}`, 500);
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return null;
    }

    const data = userDoc.data()!;
    return {
      id: userDoc.id,
      phoneNumber: data.phoneNumber,
      name: data.name,
      role: data.role,
      refreshToken: data.refreshToken,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  } catch (error: any) {
    console.error("Error getting user:", error);
    throw createError("Failed to get user", 500);
  }
};

