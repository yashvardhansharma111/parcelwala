/**
 * Environment Variable Loader
 * Loads .env and provides a centralized ENV object
 */

import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 8080,

  // Firebase
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || "",
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || "",
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || "",

  // Renflair SMS
  RENFLAIR_API_KEY: process.env.RENFLAIR_API_KEY || "",
  RENFLAIR_API_URL: process.env.RENFLAIR_API_URL || "https://sms.renflair.in/V1.php",
  // OTP Development Mode: Set to "true" to log OTPs to console instead of sending real SMS
  // Set to "false" or leave empty to send real SMS (requires RENFLAIR_API_KEY)
  OTP_DEV_MODE: process.env.OTP_DEV_MODE || "",

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || "",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "",
  ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY || "15m",
  REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY || "7d",

  // Admin
  ADMIN_PHONE_NUMBER: process.env.ADMIN_PHONE_NUMBER || "+918462044151",

  // Paygic Payment Gateway
  PAYGIC_MID: process.env.PAYGIC_MID || "FINNPAYS",
  PAYGIC_TOKEN: process.env.PAYGIC_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtaWQiOiJGSU5OUEFZUyIsIl9pZCI6IjY3Njk2MGI0ODJlNTk0MzMyMzYxMTJjOSIsImlhdCI6MTc2Mjk2MzE1NX0.M72W88k0YF126RtkQMN2d9S_UhJaodUoznZLAZsTqxU",
  PAYGIC_BASE_URL: process.env.PAYGIC_BASE_URL || "https://server.paygic.in/api/v2",
  PAYGIC_SUCCESS_URL: process.env.PAYGIC_SUCCESS_URL || "",
  PAYGIC_FAILED_URL: process.env.PAYGIC_FAILED_URL || "",

  // OneSignal Push Notifications
  ONESIGNAL_APP_ID: process.env.ONESIGNAL_APP_ID || "c7f1124b-786d-475c-b94c-1c62ed315197",
  ONESIGNAL_REST_API_KEY: process.env.ONESIGNAL_REST_API_KEY || "",
};

// Log environment variable status (without exposing sensitive values)
console.log(`✅ Environment loaded for: ${ENV.NODE_ENV}`);
console.log(`🔐 Paygic MID configured: ${ENV.PAYGIC_MID ? "Yes" : "No"} (${ENV.PAYGIC_MID})`);
console.log(`🔐 Paygic Token configured: ${ENV.PAYGIC_TOKEN ? "Yes" : "No"}`);
console.log(`🔐 Paygic Token loaded from .env: ${process.env.PAYGIC_TOKEN ? "Yes" : "No (using default)"}`);
if (ENV.PAYGIC_TOKEN) {
  const tokenPreview = `${ENV.PAYGIC_TOKEN.substring(0, 20)}...${ENV.PAYGIC_TOKEN.substring(ENV.PAYGIC_TOKEN.length - 10)}`;
  console.log(`🔐 Paygic Token preview: ${tokenPreview} (length: ${ENV.PAYGIC_TOKEN.length})`);
}
console.log(`📱 Renflair API Key configured: ${ENV.RENFLAIR_API_KEY ? "Yes" : "No"}`);
