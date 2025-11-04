/**
 * Centralized Application Configuration
 * Imports and exports all configuration settings
 */

import { firebaseConfig } from "./firebaseConfig";
import { paygicConfig } from "./paygicConfig";
import { apiConfig } from "./apiConfig";

export const AppConfig = {
  firebase: firebaseConfig, // Still needed for Firestore operations
  paygic: paygicConfig,
  api: apiConfig,
  adminPhone: "+911234567890", // Hardcoded admin phone number
  theme: {
    primary: "#FF7A00",
    background: "#FFFFFF",
    text: "#333333",
  },
};

