/**
 * API Client Service
 * Handles all HTTP requests to the backend
 */

import { Platform } from "react-native";
import { apiConfig } from "../config/apiConfig";
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  clearTokens,
} from "./tokenStorage";
import { User } from "../utils/types";

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    message: string;
  };
}

/**
 * Make API request with automatic token refresh
 */
export const apiRequest = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${apiConfig.baseUrl}${endpoint}`;
  const accessToken = await getAccessToken();

  // Add authorization header if token exists
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  // Skip ngrok browser warning page (for free tier)
  if (apiConfig.baseUrl.includes("ngrok")) {
    headers["ngrok-skip-browser-warning"] = "true";
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  try {
    // Log request for debugging (remove in production)
    if (__DEV__) {
      console.log(`[API] ${options.method || "GET"} ${url}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
      // Important for React Native
      mode: "cors",
      cache: "no-cache",
    });

    // Handle 401 - Token expired, try to refresh
    if (response.status === 401 && accessToken) {
      try {
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          // Retry request with new token
          const retryHeaders: Record<string, string> = {
            ...headers,
            Authorization: `Bearer ${newAccessToken}`,
          };
          const retryResponse = await fetch(url, {
            ...options,
            headers: retryHeaders,
          });

          if (!retryResponse.ok) {
            throw new Error(`Request failed: ${retryResponse.status}`);
          }

          const retryData: ApiResponse<T> = await retryResponse.json();
          if (!retryData.success) {
            throw new Error(retryData.error?.message || "Request failed");
          }
          return retryData.data as T;
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and throw error
        await clearTokens();
        throw new Error("Session expired. Please login again.");
      }
    }

    if (!response.ok) {
      const errorData: ApiResponse = await response.json().catch(() => ({
        success: false,
        error: { message: `Request failed: ${response.status}` },
      }));

      throw new Error(errorData.error?.message || `Request failed: ${response.status}`);
    }

    const data: ApiResponse<T> = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message || "Request failed");
    }

    return data.data as T;
  } catch (error: any) {
    // Log error for debugging
    if (__DEV__) {
      console.error(`[API Error] ${url}:`, error);
      console.error(`[API Config] Base URL: ${apiConfig.baseUrl}`);
      console.error(`[API Config] Platform: ${Platform.OS}`);
    }

    // Handle network errors with helpful messages
    const errorMsg = error.message || error.toString();
    if (
      errorMsg.includes("Network request failed") ||
      errorMsg.includes("Failed to fetch") ||
      errorMsg.includes("NetworkError") ||
      errorMsg.includes("Network request") ||
      error.name === "TypeError"
    ) {
      const baseUrl = apiConfig.baseUrl;
      const platform = Platform.OS;

      let errorMessage = "Network request failed. ";
      let suggestion = "";

      if (baseUrl.includes("localhost") && platform === "android") {
        suggestion =
          "Android cannot use 'localhost'. Use '10.0.2.2' for emulator or your computer's IP for physical device.";
      } else if (baseUrl.includes("10.0.2.2")) {
        suggestion =
          "Make sure backend is running on your host machine. Try: http://10.0.2.2:8080/health in browser.";
      } else if (baseUrl.includes("localhost") && platform !== "ios") {
        suggestion =
          "For physical device, set EXPO_PUBLIC_API_BASE_URL to your computer's IP address (e.g., http://192.168.29.34:8080)";
      } else {
        suggestion = `Cannot reach ${baseUrl}. Verify the URL is correct and backend is running.`;
      }

      errorMessage += suggestion;

      throw new Error(errorMessage);
    }

    if (error.message) {
      throw error;
    }
    throw new Error("Network error. Please check your connection.");
  }
};

/**
 * Refresh access token using refresh token
 */
const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    const refreshHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Skip ngrok browser warning page (for free tier)
    if (apiConfig.baseUrl.includes("ngrok")) {
      refreshHeaders["ngrok-skip-browser-warning"] = "true";
    }

    const response = await fetch(`${apiConfig.baseUrl}/auth/refresh`, {
      method: "POST",
      headers: refreshHeaders,
      body: JSON.stringify({ refreshToken }),
      mode: "cors",
      cache: "no-cache",
    });

    if (!response.ok) {
      return null;
    }

    const data: ApiResponse<{ accessToken: string }> = await response.json();

    if (data.success && data.data?.accessToken) {
      await setAccessToken(data.data.accessToken);
      return data.data.accessToken;
    }

    return null;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
};

/**
 * Authentication API
 */
export const authApi = {
  /**
   * Send OTP to phone number
   */
  sendOTP: async (phoneNumber: string): Promise<void> => {
    await apiRequest("/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ phoneNumber }),
    });
  },

  /**
   * Verify OTP and get tokens
   */
  verifyOTP: async (
    phoneNumber: string,
    otp: string
  ): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
  }> => {
    return await apiRequest<{
      user: User;
      accessToken: string;
      refreshToken: string;
    }>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phoneNumber, otp }),
    });
  },

  /**
   * Refresh access token
   */
  refreshToken: async (refreshToken: string): Promise<string> => {
    const data = await apiRequest<{ accessToken: string }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
    return data.accessToken;
  },

  /**
   * Logout (invalidate refresh token)
   */
  logout: async (refreshToken: string): Promise<void> => {
    await apiRequest("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  },
};

/**
 * User API
 */
export const userApi = {
  /**
   * Get user profile
   */
  getProfile: async (): Promise<User> => {
    return await apiRequest<User>("/user/profile", {
      method: "GET",
    });
  },
};

/**
 * Admin API
 */
export const adminApi = {
  /**
   * Get admin dashboard data
   */
  getDashboard: async (): Promise<any> => {
    return await apiRequest("/admin/dashboard", {
      method: "GET",
    });
  },
};

/**
 * Map API (Address autocomplete, reverse geocoding, fare calculation)
 */
export const mapApi = {
  /**
   * Get address autocomplete suggestions
   */
  autocomplete: async (query: string, limit: number = 5): Promise<{
    suggestions: Array<{
      displayName: string;
      coordinates: { lat: number; lon: number };
      address: {
        name: string;
        street?: string;
        city?: string;
        state?: string;
        postcode?: string;
        country?: string;
      };
    }>;
  }> => {
    return await apiRequest(`/map/autocomplete?q=${encodeURIComponent(query)}&limit=${limit}`, {
      method: "GET",
    });
  },

  /**
   * Get full address details from coordinates
   */
  getAddressDetails: async (lat: number, lon: number): Promise<{
    address: {
      name: string;
      houseNumber?: string;
      street?: string;
      address: string;
      city: string;
      state: string;
      pincode: string;
      landmark?: string;
      coordinates: { lat: number; lon: number };
    };
  }> => {
    return await apiRequest("/map/details", {
      method: "POST",
      body: JSON.stringify({ lat, lon }),
    });
  },

  /**
   * Calculate fare based on locations and weight
   */
  calculateFare: async (
    pickup: { lat: number; lon: number },
    drop: { lat: number; lon: number },
    weight: number
  ): Promise<{
    distanceInKm: number;
    baseFare: number;
    gst: number;
    totalFare: number;
  }> => {
    return await apiRequest("/map/fare", {
      method: "POST",
      body: JSON.stringify({ pickup, drop, weight }),
    });
  },

  /**
   * Get pricing settings (Admin only)
   */
  getPricing: async (): Promise<{
    pricing: {
      baseRates: Array<{
        minKm: number;
        maxKm: number;
        maxWeight: number;
        fare: number;
        applyGst?: boolean;
      }>;
      gstPercent: number;
    };
  }> => {
    return await apiRequest("/map/admin/pricing", {
      method: "GET",
    });
  },

  /**
   * Update pricing settings (Admin only)
   */
  updatePricing: async (pricing: {
    baseRates?: Array<{
      minKm: number;
      maxKm: number;
      maxWeight: number;
      fare: number;
      applyGst?: boolean;
    }>;
    gstPercent?: number;
  }): Promise<{
    pricing: {
      baseRates: Array<{
        minKm: number;
        maxKm: number;
        maxWeight: number;
        fare: number;
        applyGst?: boolean;
      }>;
      gstPercent: number;
    };
  }> => {
    return await apiRequest("/map/admin/pricing", {
      method: "PUT",
      body: JSON.stringify(pricing),
    });
  },
};

/**
 * Test API connection
 * Useful for debugging network issues
 */
export const testConnection = async (): Promise<void> => {
  try {
    const url = `${apiConfig.baseUrl}/health`;
    if (__DEV__) {
      console.log(`[API Test] Testing connection to: ${url}`);
    }

    const testHeaders: Record<string, string> = {};

    // Skip ngrok browser warning page (for free tier)
    if (apiConfig.baseUrl.includes("ngrok")) {
      testHeaders["ngrok-skip-browser-warning"] = "true";
    }

    const response = await fetch(url, {
      method: "GET",
      headers: testHeaders,
      mode: "cors",
      cache: "no-cache",
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }

    const data = await response.json();
    if (__DEV__) {
      console.log(`[API Test] Connection successful:`, data);
    }
  } catch (error: any) {
    if (__DEV__) {
      console.error(`[API Test] Connection failed:`, error);
      console.error(`[API Test] URL: ${apiConfig.baseUrl}/health`);
      console.error(`[API Test] Platform: ${Platform.OS}`);
    }
    throw error;
  }
};

