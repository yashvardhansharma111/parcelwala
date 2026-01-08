/**
 * OTP Service
 * Handles OTP generation and sending via Renflair SMS API
 * Documentation: https://renflair.in/sms.php
 * 
 * ============================================================================
 * QUICK SWITCH BETWEEN DEV AND PROD MODE
 * ============================================================================
 * 
 * METHOD 1 (Recommended): Use environment variable
 *   - Add to .env: OTP_DEV_MODE=true  (for development - logs to console)
 *   - Add to .env: OTP_DEV_MODE=false (for production - sends real SMS)
 * 
 * METHOD 2: Use NODE_ENV
 *   - Set NODE_ENV=development (dev mode - logs to console)
 *   - Set NODE_ENV=production  (prod mode - sends real SMS)
 * 
 * METHOD 3: Force mode in code (see sendOTP function below)
 *   - Uncomment: const OTP_DEV_MODE = true;  (force dev mode)
 *   - Uncomment: const OTP_DEV_MODE = false; (force prod mode)
 * 
 * METHOD 4: Comment out production SMS code block
 *   - Comment out the entire "PRODUCTION SMS CODE" section in sendOTP()
 * 
 * ============================================================================
 */

import axios from "axios";
import { ENV } from "../config/env";
import { generateOTP } from "../utils/generateOTP";
import { cacheService } from "./cacheService";
import { createError } from "../utils/errorHandler";

/**
 * Extract 10-digit phone number from various formats
 * Handles: +91XXXXXXXXXX, 91XXXXXXXXXX, XXXXXXXXXX
 */
const extractPhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, "");
  
  // If starts with 91, remove it (country code)
  if (digits.startsWith("91") && digits.length === 12) {
    return digits.slice(2);
  }
  
  // If 10 digits, return as is
  if (digits.length === 10) {
    return digits;
  }
  
  // If more than 10 digits, take last 10
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  
  throw createError("Invalid phone number format", 400);
};

/**
 * Normalize phone number to consistent format for cache key
 * Always returns +91XXXXXXXXXX format
 */
const normalizePhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, "");
  
  // Extract 10-digit number
  let phoneDigits: string;
  if (digits.startsWith("91") && digits.length === 12) {
    phoneDigits = digits.slice(2);
  } else if (digits.length === 10) {
    phoneDigits = digits;
  } else if (digits.length > 10) {
    phoneDigits = digits.slice(-10);
  } else {
    throw createError("Invalid phone number format", 400);
  }
  
  // Return normalized format: +91XXXXXXXXXX
  return `+91${phoneDigits}`;
};

/**
 * Send OTP via Renflair SMS API
 * 
 * ============================================================================
 * DEVELOPMENT vs PRODUCTION MODE
 * ============================================================================
 * 
 * To switch between dev and prod modes, modify the OTP_DEV_MODE check below:
 * 
 * DEVELOPMENT MODE (Logs OTP to console - no real SMS sent):
 *   - Set OTP_DEV_MODE = true in .env OR
 *   - Set NODE_ENV = "development" OR
 *   - Comment out the production SMS code block
 * 
 * PRODUCTION MODE (Sends real SMS via Renflair API):
 *   - Set OTP_DEV_MODE = false in .env AND
 *   - Set NODE_ENV = "production" AND
 *   - Ensure RENFLAIR_API_KEY is set in .env
 * 
 * ============================================================================
 * 
 * API Endpoint: https://sms.renflair.in/V1.php
 * Format: https://sms.renflair.in/V1.php?API={API_KEY}&PHONE={PHONE}&OTP={OTP}
 * Message format: "{OTP} is your verification code for {domain.com}"
 */
export const sendOTP = async (phoneNumber: string): Promise<void> => {
  try {
    // Normalize phone number for consistent cache key
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    // ============================================================================
    // DEMO USER BYPASS
    // For phone number +919999999999, always use OTP 000000 (no SMS sent)
    // ============================================================================
    const demoPhoneNumber = "+919999999999"; // Normalized format
    if (normalizedPhone === demoPhoneNumber) {
      const demoOTP = "000000";
      console.log("=".repeat(60));
      console.log("🧪 DEMO USER MODE - Demo number detected");
      console.log("=".repeat(60));
      console.log(`📱 Phone Number: ${normalizedPhone}`);
      console.log(`🔐 OTP Code: ${demoOTP}`);
      console.log(`⏰ Valid for: Always (no expiry)`);
      console.log("=".repeat(60));
      console.log(`✅ Demo OTP mode activated. Use OTP: ${demoOTP}`);
      console.log("=".repeat(60));
      // Store OTP in cache so verification works properly
      cacheService.setOTP(normalizedPhone, demoOTP, 3600); // Store for 1 hour
      return; // Exit early - no SMS sent
    }

    // Generate 6-digit OTP
    const otp = generateOTP();

    // Store OTP in cache for 10 minutes (use normalized phone as key)
    const stored = cacheService.setOTP(normalizedPhone, otp, 600);
    console.log(`💾 OTP cache set result: ${stored}, key: ${normalizedPhone}, TTL: 600s`);
    console.log(`🔍 Current cache keys after storing:`, cacheService.getAllKeys());

    // Extract 10-digit phone number (without country code)
    const phone = extractPhoneNumber(phoneNumber);

    // ============================================================================
    // CHECK DEV MODE: Use environment variable or NODE_ENV
    // ============================================================================
    // Determine if we're in dev mode:
    // - OTP_DEV_MODE="true" in .env → dev mode (log to console)
    // - OTP_DEV_MODE="false" or empty → production mode (send real SMS)
    // - NODE_ENV="development" → dev mode (log to console)
    // - NODE_ENV="production" → production mode (send real SMS)
    const isDevMode = 
      ENV.OTP_DEV_MODE?.toLowerCase() === "true" || 
      (ENV.OTP_DEV_MODE === "" && ENV.NODE_ENV === "development");

    if (isDevMode) {
      // ============================================================================
      // DEVELOPMENT MODE: Log OTP to console (NO SMS SENT)
      // ============================================================================
      console.log("=".repeat(60));
      console.log("🔧 DEVELOPMENT MODE - OTP LOGGED TO CONSOLE (NO SMS SENT)");
      console.log("=".repeat(60));
      console.log(`📱 Phone Number: ${normalizedPhone}`);
      console.log(`🔐 OTP Code: ${otp}`);
      console.log(`⏰ Valid for: 10 minutes`);
      console.log("=".repeat(60));
      console.log(`✅ OTP generated and stored in cache with key: ${normalizedPhone}`);
      console.log("=".repeat(60));
      console.log(`💡 To enable real SMS, set OTP_DEV_MODE=false in .env`);
      console.log("=".repeat(60));
      return; // Exit early - no SMS sent in dev mode
    }

    // ============================================================================
    // PRODUCTION MODE: Send real SMS via Renflair API
    // ============================================================================
    if (!ENV.RENFLAIR_API_KEY) {
      console.error("❌ RENFLAIR_API_KEY not configured in .env");
      throw createError("SMS service not configured. Please contact support.", 500);
    }

    try {
      // Build Renflair API URL
      const apiUrl = `${ENV.RENFLAIR_API_URL}?API=${encodeURIComponent(ENV.RENFLAIR_API_KEY)}&PHONE=${encodeURIComponent(phone)}&OTP=${encodeURIComponent(otp)}`;
      
      console.log("=".repeat(60));
      console.log("📤 PRODUCTION MODE - Sending OTP via Renflair SMS API");
      console.log("=".repeat(60));
      console.log(`📱 Phone Number: ${normalizedPhone}`);
      console.log(`🔐 OTP Code: ${otp}`);
      console.log(`🌐 API URL: ${ENV.RENFLAIR_API_URL}`);
      console.log("=".repeat(60));

      // Send SMS via Renflair API
      const response = await axios.get(apiUrl, {
        timeout: 10000, // 10 second timeout
      });

      console.log(`✅ Renflair API Response Status: ${response.status}`);
      console.log(`✅ Renflair API Response Data:`, response.data);
      console.log("=".repeat(60));
      console.log(`✅ OTP sent successfully to ${normalizedPhone}`);
      console.log("=".repeat(60));

      // Renflair API returns success message in response
      if (response.data && typeof response.data === "string") {
        const responseText = response.data.toLowerCase();
        if (responseText.includes("error") || responseText.includes("failed")) {
          console.error("❌ Renflair API returned error:", response.data);
          throw createError("Failed to send OTP. Please try again.", 500);
        }
      }
    } catch (smsError: any) {
      console.error("❌ Error sending SMS via Renflair API:", smsError);
      
      // Log OTP to console as fallback (so user can still test)
      console.log("=".repeat(60));
      console.log("⚠️  SMS SEND FAILED - OTP LOGGED TO CONSOLE AS FALLBACK");
      console.log("=".repeat(60));
      console.log(`📱 Phone Number: ${normalizedPhone}`);
      console.log(`🔐 OTP Code: ${otp} (use this for testing)`);
      console.log(`⏰ Valid for: 10 minutes`);
      console.log("=".repeat(60));
      
      // Still throw error so frontend knows SMS failed
      if (smsError.response?.data) {
        console.error("Renflair API Error Response:", smsError.response.data);
        throw createError(
          smsError.response.data.message || "Failed to send OTP. Please try again.",
          500
        );
      }
      
      if (smsError.code === "ECONNABORTED") {
        throw createError("Request timeout. Please check your internet connection.", 500);
      }
      
      throw createError("Failed to send OTP. Please try again.", 500);
    }
  } catch (error: any) {
    console.error("Error sending OTP:", error);
    
    // Handle specific error cases
    if (error.response?.data) {
      console.error("Renflair API Error Response:", error.response.data);
      throw createError(
        error.response.data.message || "Failed to send OTP. Please try again.",
        500
      );
    }
    
    if (error.code === "ECONNABORTED") {
      throw createError("Request timeout. Please check your internet connection.", 500);
    }
    
    // Don't expose internal error details to client
    throw createError("Failed to send OTP. Please try again.", 500);
  }
};

/**
 * Verify OTP
 */
export const verifyOTP = (phoneNumber: string, otp: string): boolean => {
  try {
    // Normalize phone number to match the key used when storing OTP
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    // ============================================================================
    // DEMO USER BYPASS
    // For phone number +919999999999, always accept OTP 000000
    // ============================================================================
    const demoPhoneNumber = "+919999999999"; // Normalized format
    if (normalizedPhone === demoPhoneNumber && otp === "000000") {
      console.log(`✅ DEMO USER MODE: Accepting OTP 000000 for demo number ${normalizedPhone}`);
      // Delete any existing OTP from cache if present
      if (cacheService.hasOTP(normalizedPhone)) {
        cacheService.deleteOTP(normalizedPhone);
      }
      return true;
    }
    
    // Also check if OTP is stored in cache (for demo user, we store it)
    if (normalizedPhone === demoPhoneNumber) {
      const storedOTP = cacheService.getOTP(normalizedPhone);
      if (storedOTP === otp) {
        console.log(`✅ DEMO USER MODE: OTP verified from cache for ${normalizedPhone}`);
        cacheService.deleteOTP(normalizedPhone);
        return true;
      }
    }
    
    console.log(`🔍 Verifying OTP for: ${normalizedPhone}`);
    console.log(`🔍 Current cache keys before lookup:`, cacheService.getAllKeys());
    console.log(`🔍 Cache has key ${normalizedPhone}:`, cacheService.hasOTP(normalizedPhone));
    
    const storedOTP = cacheService.getOTP(normalizedPhone);

    if (!storedOTP) {
      const allKeys = cacheService.getAllKeys();
      console.log(`❌ OTP not found for ${normalizedPhone}`);
      console.log(`❌ Available cache keys:`, allKeys);
      console.log(`❌ Cache stats:`, {
        hasKey: cacheService.hasOTP(normalizedPhone),
        allKeys: allKeys,
        keyCount: allKeys.length,
        normalizedPhone: normalizedPhone
      });
      
      // Check if server might have restarted (cache is empty)
      if (allKeys.length === 0) {
        console.warn(`⚠️  Cache is empty - server may have restarted. OTP was lost.`);
      }
      
      return false; // OTP not found or expired
    }

    if (storedOTP !== otp) {
      console.log(`OTP mismatch for ${normalizedPhone}. Expected: ${storedOTP}, Received: ${otp}`);
      return false; // OTP mismatch
    }

    // OTP is valid, delete it from cache (one-time use)
    cacheService.deleteOTP(normalizedPhone);

    return true;
  } catch (error: any) {
    console.error("Error verifying OTP:", error);
    return false;
  }
};

