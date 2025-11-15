/**
 * Application Credentials
 * Centralized configuration for all sensitive keys and settings
 */

export const AppCreds = {
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || "",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n") || "",
  },
  renflair: {
    apiKey: process.env.RENFLAIR_API_KEY || "",
    apiUrl: process.env.RENFLAIR_API_URL || "https://sms.renflair.in/V1.php",
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || "super-secret-key-change-in-production",
    jwtRefreshSecret:
      process.env.JWT_REFRESH_SECRET || "super-refresh-secret-change-in-production",
    accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || "15m",
    refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || "7d",
  },
  admin: {
    phoneNumber: process.env.ADMIN_PHONE_NUMBER || "+918462044151",
  },
  onesignal: {
    appId: process.env.ONESIGNAL_APP_ID || "",
    restApiKey: process.env.ONESIGNAL_REST_API_KEY || "os_v2_app_y7yres3ynvdvzokmdrro2mkrs7xkq264wshuaqnhh5w2kf6toxsrzz67osqjaoywiixkygkcgzowdov5p3zjje6yxvq664gzxcpetgi",
  },
};

