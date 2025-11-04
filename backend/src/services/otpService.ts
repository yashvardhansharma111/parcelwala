/**
 * OTP Service
 * Handles OTP generation and sending via Renflair SMS API
 * Documentation: https://renflair.in/sms.php
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
 * Send OTP via Renflair SMS API
 * API Endpoint: https://sms.renflair.in/V1.php
 * Format: https://sms.renflair.in/V1.php?API={API_KEY}&PHONE={PHONE}&OTP={OTP}
 * Message format: "{OTP} is your verification code for {domain.com}"
 */
export const sendOTP = async (phoneNumber: string): Promise<void> => {
  try {
    // Validate API key
    if (!ENV.RENFLAIR_API_KEY || ENV.RENFLAIR_API_KEY.trim() === "") {
      throw createError(
        "Renflair API key not configured. Please set RENFLAIR_API_KEY in your .env file",
        500
      );
    }

    // Generate 6-digit OTP
    const otp = generateOTP();

    // Store OTP in cache for 5 minutes
    cacheService.setOTP(phoneNumber, otp, 300);

    // Extract 10-digit phone number (without country code)
    const phone = extractPhoneNumber(phoneNumber);

    // Renflair API endpoint for OTP
    const apiUrl = "https://sms.renflair.in/V1.php";
    
    // Build query parameters
    const params = new URLSearchParams({
      API: ENV.RENFLAIR_API_KEY,
      PHONE: phone,
      OTP: otp,
    });

    const fullUrl = `${apiUrl}?${params.toString()}`;

    console.log(`Sending OTP to ${phone} via Renflair API...`);
    
    // Send SMS via Renflair API (GET request)
    const response = await axios.get(fullUrl, {
      timeout: 10000, // 10 second timeout
    });

    // Log response for debugging
    console.log("Renflair API Response:", {
      status: response.status,
      data: response.data,
    });

    // Check if SMS was sent successfully
    // Renflair API typically returns JSON with status
    if (response.status !== 200) {
      throw createError("Failed to send OTP via SMS", 500);
    }

    // Check response data for success/failure indicators
    const responseData = response.data;
    if (typeof responseData === "object") {
      // If response has error or failure status
      if (responseData.error || responseData.status === "error" || responseData.status === false) {
        console.error("Renflair API Error:", responseData);
        throw createError(responseData.message || "Failed to send OTP via SMS", 500);
      }
    }

    console.log(`✅ OTP sent successfully to ${phone}: ${otp}`);
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
  const storedOTP = cacheService.getOTP(phoneNumber);

  if (!storedOTP) {
    return false; // OTP not found or expired
  }

  if (storedOTP !== otp) {
    return false; // OTP mismatch
  }

  // OTP is valid, delete it from cache (one-time use)
  cacheService.deleteOTP(phoneNumber);

  return true;
};

