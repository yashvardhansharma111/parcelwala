/**
 * Notification Service
 * Handles OneSignal Push Notification registration
 * Uses OneSignal SDK for reliable push notifications
 */

import { Platform } from "react-native";
import Constants from "expo-constants";
import { OneSignal } from "react-native-onesignal";
import { registerOneSignalPlayerId } from "./apiClient";
import { useAuthStore } from "../store/authStore";

/**
 * Check if running in Expo Go (which doesn't support native modules)
 */
export const isExpoGo = (): boolean => {
  try {
    if (Constants.executionEnvironment === "storeClient") {
      return true;
    }
    if (Constants.appOwnership === "expo") {
      return true;
    }
    if (Constants.isDevice === false) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Get OneSignal App ID from config
 */
const getOneSignalAppId = (): string => {
  // Try to get from expo config
  const expoAppId = Constants?.expoConfig?.extra?.onesignal?.appId;
  if (expoAppId) {
    return expoAppId;
  }
  
  // Try to get from EAS config (with type assertion for extra property)
  const easConfig = Constants?.easConfig as any;
  const easAppId = easConfig?.extra?.onesignal?.appId;
  if (easAppId) {
    return easAppId;
  }
  
  // Fallback to hardcoded value
  return "0f28bb2e-e63e-4bfa-9710-77dcaf7b3aa7";
};

/**
 * Initialize OneSignal SDK
 */
let oneSignalInitialized = false;

const initializeOneSignal = (): void => {
  if (oneSignalInitialized) {
    return;
  }

  try {
    const appId = getOneSignalAppId();
    // OneSignal initialization
    
    // Initialize OneSignal (v5.x API)
    OneSignal.initialize(appId);
    
    // Set up notification handlers
    OneSignal.Notifications.addEventListener('click', (event: any) => {
      // Notification opened - handled by navigation
      // Handle navigation or other actions when notification is opened
      // You can add navigation logic here based on notification data
    });

    OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event: any) => {
      // Notification received in foreground
      // Display notification in foreground
      event.getNotification().display();
    });

    oneSignalInitialized = true;
    // OneSignal initialized
  } catch (error: any) {
    console.error("[OneSignal] ❌ Error initializing:", error);
  }
};

/**
 * Register for push notifications and save OneSignal Player ID to backend
 */
export const registerForPushNotifications = async (): Promise<string | null> => {
  // Check if running in Expo Go
  const isExpoGoApp = isExpoGo();
  // Check if running in Expo Go
  
  // Skip registration if running in Expo Go
  if (isExpoGoApp) {
    console.warn("[OneSignal] Skipping registration - running in Expo Go");
    console.warn("[OneSignal] OneSignal requires a development build or production build");
    return null;
  }

  try {
    // Initialize OneSignal
    initializeOneSignal();

    // Get current user from auth store
    const { user } = useAuthStore.getState();
    
    if (!user) {
      // User not authenticated, skipping registration
      return null;
    }

    // Prompt for push notification permission
    OneSignal.User.pushSubscription.optIn();

    // Get Player ID from subscription (async method)
    const playerId = await OneSignal.User.pushSubscription.getIdAsync();

    if (!playerId) {
      console.warn("[OneSignal] No Player ID available yet. OneSignal may still be initializing.");
      // Return null but don't throw - OneSignal will initialize asynchronously
      return null;
    }

    // Player ID obtained

    // Set external user ID to link OneSignal user to Firebase user
    try {
      OneSignal.login(user.id); // Use user.id (Firebase UID)
      // External User ID set
    } catch (error: any) {
      console.error("[OneSignal] Error setting external user ID:", error);
    }

    // Register Player ID with backend
    try {
      // Registering Player ID with backend
      await registerOneSignalPlayerId(playerId);
        // Player ID registered successfully
    } catch (error: any) {
      console.error("[OneSignal] ❌ Failed to register Player ID:", error);
      // Don't throw - registration might still work
    }

    return playerId;
  } catch (error: any) {
    console.error("[OneSignal] Error registering for push notifications:", error);
    return null;
  }
};
