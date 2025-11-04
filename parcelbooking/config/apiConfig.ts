/**
 * Backend API Configuration
 * Load backend URL from environment variables
 */

import { Platform } from "react-native";

/**
 * Get the correct base URL based on platform
 * - Priority 1: EXPO_PUBLIC_API_BASE_URL env variable (supports ngrok, IP, etc.)
 * - Android Emulator: Use 10.0.2.2 (maps to host machine's localhost)
 * - iOS Simulator: Use localhost
 * - Physical Devices: Use actual IP address or env variable
 */
const getBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  // If explicitly set in env (ngrok, IP, etc.), use it
  if (envUrl) {
    // Remove trailing slash if present
    return envUrl.trim().replace(/\/+$/, "");
  }

  // Default based on platform (only if env not set)
  if (Platform.OS === "android") {
    // Android emulator uses 10.0.2.2 to access host machine's localhost
    return "http://10.0.2.2:8080";
  } else if (Platform.OS === "ios") {
    // iOS simulator can use localhost
    return "http://localhost:8080";
  }

  // Fallback
  return "http://localhost:8080";
};

export const apiConfig = {
  baseUrl: getBaseUrl(),
  timeout: 30000, // 30 seconds
};

