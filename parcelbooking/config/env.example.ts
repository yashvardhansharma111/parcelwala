/**
 * Example Environment Variables
 * Copy this to .env and fill in your actual credentials
 */

export const ENV_EXAMPLE = {
  // Backend API Configuration
  // Option 1: Local development
  EXPO_PUBLIC_API_BASE_URL: "http://localhost:8080", // For development
  
  // Option 2: Physical device - use your computer's IP
  // EXPO_PUBLIC_API_BASE_URL: "http://192.168.29.34:8080", // Replace with your IP
  
  // Option 3: Using ngrok for testing
  // EXPO_PUBLIC_API_BASE_URL: "https://dee6839993d2.ngrok-free.app", // ngrok URL (no trailing slash)
  
  // Option 4: Production
  // EXPO_PUBLIC_API_BASE_URL: "https://your-backend-domain.com", // For production

  // Firebase Configuration (Still needed for Firestore operations)
  EXPO_PUBLIC_FIREBASE_API_KEY: "your-firebase-api-key",
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: "your-project.firebaseapp.com",
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: "your-project-id",
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: "your-project.appspot.com",
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123456789",
  EXPO_PUBLIC_FIREBASE_APP_ID: "1:123456789:web:abcdef",

  // PayGIC Configuration
  EXPO_PUBLIC_PAYGIC_KEY: "your-paygic-api-key",
  EXPO_PUBLIC_PAYGIC_SECRET: "your-paygic-secret",
};

