/**
 * PayGIC Payment Gateway Configuration
 * Load credentials from environment variables
 */

export const paygicConfig = {
  apiKey: process.env.EXPO_PUBLIC_PAYGIC_KEY || "",
  apiSecret: process.env.EXPO_PUBLIC_PAYGIC_SECRET || "",
  baseUrl: "https://api.paygic.com", // Update with actual PayGIC API URL
};

