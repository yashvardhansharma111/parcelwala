/**
 * Authentication Service
 * Handles backend API authentication with OTP
 */

import { authApi, userApi } from "./apiClient";
import {
  setAccessToken,
  setRefreshToken,
  setUser,
  getAccessToken,
  getRefreshToken,
  getUser,
  clearTokens,
} from "./tokenStorage";
import { User } from "../utils/types";

// Store phone number during OTP flow
let phoneNumberForOTP: string | null = null;

/**
 * Send OTP to phone number
 * @param phoneNumber - Phone number
 * @param name - Optional name (for signup requests)
 */
export const sendOTP = async (phoneNumber: string, name?: string): Promise<{ requiresSignup?: boolean }> => {
  try {
    const formattedPhone = phoneNumber.startsWith("+")
      ? phoneNumber
      : `+91${phoneNumber}`;

    phoneNumberForOTP = formattedPhone;
    const response = await authApi.sendOTP(formattedPhone, name);
    
    // Check if backend indicates user needs to signup
    // response might be undefined if no data field, so check safely
    if (response && response.requiresSignup) {
      phoneNumberForOTP = null;
      return { requiresSignup: true };
    }
    
    return {};
  } catch (error: any) {
    phoneNumberForOTP = null;
    throw new Error(error.message || "Failed to send OTP");
  }
};

/**
 * Verify OTP code
 */
export const verifyOTP = async (code: string, name?: string): Promise<{ user: User; requiresName?: boolean } | { requiresName: true }> => {
  try {
    if (!phoneNumberForOTP) {
      throw new Error("No OTP session found. Please request OTP again.");
    }

    if (code.length !== 6) {
      throw new Error("OTP must be 6 digits");
    }

    // Verify OTP with backend (name is optional - only required for new users)
    const response = await authApi.verifyOTP(phoneNumberForOTP, code, name?.trim());

    // If name is required (new user), return the flag
    if (response.requiresName) {
      return { requiresName: true };
    }

    // Validate that we have all required data
    if (!response.accessToken || !response.refreshToken || !response.user) {
      throw new Error("Invalid response from server. Missing authentication data.");
    }

    // Store tokens and user data
    await setAccessToken(response.accessToken);
    await setRefreshToken(response.refreshToken);
    await setUser(response.user);

    // Convert dates if needed
    const userData: User = {
      ...response.user,
      createdAt: response.user.createdAt
        ? new Date(response.user.createdAt)
        : new Date(),
      updatedAt: response.user.updatedAt
        ? new Date(response.user.updatedAt)
        : new Date(),
    };

    phoneNumberForOTP = null;
    return { user: userData };
  } catch (error: any) {
    throw new Error(error.message || "Failed to verify OTP");
  }
};

/**
 * Sign out user
 */
export const signOut = async (): Promise<void> => {
  try {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch (error) {
        // Even if logout fails, clear local tokens
        console.warn("Logout API call failed, clearing local tokens:", error);
      }
    }

    await clearTokens();
    phoneNumberForOTP = null;
  } catch (error: any) {
    // Clear tokens even if logout fails
    await clearTokens();
    phoneNumberForOTP = null;
    throw new Error(error.message || "Failed to sign out");
  }
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return null;
    }

    // Try to get user from storage first
    const storedUser = await getUser();
    if (storedUser) {
      // Convert dates
      return {
        ...storedUser,
        createdAt: storedUser.createdAt
          ? new Date(storedUser.createdAt)
          : new Date(),
        updatedAt: storedUser.updatedAt
          ? new Date(storedUser.updatedAt)
          : new Date(),
      };
    }

    // If not in storage, fetch from API
    try {
      const user = await userApi.getProfile();
      await setUser(user);

      return {
        ...user,
        createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
        updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date(),
      };
    } catch (error) {
      // API call failed, return stored user if exists
      return storedUser
        ? {
            ...storedUser,
            createdAt: storedUser.createdAt
              ? new Date(storedUser.createdAt)
              : new Date(),
            updatedAt: storedUser.updatedAt
              ? new Date(storedUser.updatedAt)
              : new Date(),
          }
        : null;
    }
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

