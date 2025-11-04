/**
 * Authentication Hook
 * Handles OTP flow and role-based routing with backend API
 */

import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuthStore } from "../store/authStore";
import * as authService from "../services/authService";
import { User } from "../utils/types";

export const useAuth = () => {
  const router = useRouter();
  const { user, setUser, setLoading, logout: storeLogout, loading } =
    useAuthStore();
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already authenticated
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      setLoading(true);
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        // Don't redirect here - let the root layout handle routing
      }
    } catch (error: any) {
      console.error("Error checking auth state:", error);
      // If token is invalid, clear user
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const sendOTP = async (phoneNumber: string) => {
    try {
      setError(null);
      setLoading(true);
      await authService.sendOTP(phoneNumber);
      setOtpSent(true);
    } catch (error: any) {
      setError(error.message || "Failed to send OTP");
      setOtpSent(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (code: string) => {
    try {
      setError(null);
      setLoading(true);
      const userData = await authService.verifyOTP(code);
      setUser(userData);
      setOtpSent(false);
      redirectBasedOnRole(userData);
      return userData;
    } catch (error: any) {
      setError(error.message || "Failed to verify OTP");
      setOtpSent(true); // Keep OTP sent state for retry
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const redirectBasedOnRole = (userData: User) => {
    // Use a small delay to ensure router is ready
    setTimeout(() => {
      try {
        if (userData.role === "admin") {
          router.replace("/(admin)/dashboard");
        } else {
          router.replace("/(customer)/home");
        }
      } catch (error) {
        // Router might not be ready yet, ignore
        console.warn("Router not ready for navigation:", error);
      }
    }, 100);
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authService.signOut();
      storeLogout();
      setOtpSent(false);
      // Use a small delay to ensure router is ready
      setTimeout(() => {
        try {
          router.replace("/login" as any);
        } catch (error) {
          // Router might not be ready yet, ignore
          console.warn("Router not ready for navigation:", error);
        }
      }, 100);
    } catch (error: any) {
      setError(error.message || "Failed to logout");
      // Clear user even if logout fails
      storeLogout();
      setOtpSent(false);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    otpSent,
    error,
    loading,
    sendOTP,
    verifyOTP,
    logout,
    checkAuthState,
  };
};

