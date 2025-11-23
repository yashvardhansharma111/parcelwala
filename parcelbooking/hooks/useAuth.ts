/**
 * Authentication Hook
 * Handles OTP flow and role-based routing with backend API
 */

import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuthStore } from "../store/authStore";
import { useBookingStore } from "../store/bookingStore";
import * as authService from "../services/authService";
import { registerForPushNotifications, isExpoGo } from "../services/notificationService";
import { User } from "../utils/types";

export const useAuth = () => {
  const router = useRouter();
  const { user, setUser, setLoading, logout: storeLogout, loading } =
    useAuthStore();
  const { clearBookings } = useBookingStore();
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
        // Register for push notifications if user is authenticated (skip in Expo Go)
        if (!isExpoGo()) {
          registerForPushNotifications().catch((error) => {
            // Silently handle - don't log Expo Go errors
            if (!error?.message?.includes("Expo Go") && !error?.message?.includes("development build")) {
              console.error("Error registering push notifications:", error);
            }
          });
        }
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
      const result = await authService.sendOTP(phoneNumber);
      
      // Check if user needs to signup
      if (result.requiresSignup) {
        setOtpSent(false);
        return { requiresSignup: true };
      }
      
      setOtpSent(true);
      return {};
    } catch (error: any) {
      setError(error.message || "Failed to send OTP");
      setOtpSent(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (code: string, name?: string) => {
    try {
      setError(null);
      setLoading(true);
      const result = await authService.verifyOTP(code, name);
      
      // If name is required, return the result with requiresName flag
      if (result.requiresName) {
        return result;
      }
      
      // Otherwise, proceed with normal login
      setUser(result.user);
      setOtpSent(false);
      
      // Register for push notifications after successful login (skip in Expo Go)
      if (!isExpoGo()) {
        registerForPushNotifications().catch((error) => {
          // Silently handle - don't log Expo Go errors
          if (!error?.message?.includes("Expo Go") && !error?.message?.includes("development build")) {
            console.error("Error registering push notifications:", error);
          }
        });
      }
      
      redirectBasedOnRole(result.user);
      return result;
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
      // Clear bookings before logging out
      clearBookings();
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
      // Clear user and bookings even if logout fails
      clearBookings();
      storeLogout();
      setOtpSent(false);
    } finally {
      setLoading(false);
    }
  };

  const resetOTP = () => {
    setOtpSent(false);
    setError(null);
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
    resetOTP,
  };
};

