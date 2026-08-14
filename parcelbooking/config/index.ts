/**
 * Centralized Application Configuration
 */

import { firebaseConfig } from "./firebaseConfig";
import { payuConfig } from "./payuConfig";
import { apiConfig } from "./apiConfig";

export const AppConfig = {
  firebase: firebaseConfig,
  payu: payuConfig,
  api: apiConfig,
  adminPhone: "+911234567890",
  theme: {
    primary: "#FF7A00",
    background: "#FFFFFF",
    text: "#333333",
  },
};
