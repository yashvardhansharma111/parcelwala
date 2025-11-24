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
import { sanitizeErrorMessage } from "../utils/formatters";

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
    // Request logging removed for production

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

          const retryData = await retryResponse.json() as ApiResponse<T>;
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
      const errorData = await response.json().catch(() => ({
        success: false,
        error: { message: `Request failed: ${response.status}` },
      })) as ApiResponse;

      throw new Error(errorData.error?.message || `Request failed: ${response.status}`);
    }

    const data = await response.json() as ApiResponse<T>;

    if (!data.success) {
      throw new Error(data.error?.message || "Request failed");
    }

    return data.data as T;
  } catch (error: any) {
    // Log error for debugging (only in dev mode)
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
      errorMsg.includes("ECONNREFUSED") ||
      errorMsg.includes("ETIMEDOUT") ||
      errorMsg.includes("ENOTFOUND") ||
      errorMsg.includes("ECONNABORTED") ||
      error.name === "TypeError"
    ) {
      // Generic error message without exposing backend URL
      throw new Error("Unable to connect to the server. Please check your internet connection and try again.");
    }

    // For other errors, sanitize the message to remove any URLs
    if (error.message) {
      const sanitizedMessage = sanitizeErrorMessage(error.message);
      throw new Error(sanitizedMessage);
    }
    
    // Fallback generic error
    throw new Error("An error occurred. Please try again.");
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

    const data = await response.json() as ApiResponse<{ accessToken: string }>;

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
  sendOTP: async (phoneNumber: string): Promise<{ requiresSignup?: boolean }> => {
    return await apiRequest<{ requiresSignup?: boolean }>("/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ phoneNumber }),
    });
  },

  /**
   * Verify OTP and get tokens
   */
  verifyOTP: async (
    phoneNumber: string,
    otp: string,
    name?: string
  ): Promise<{
    user?: User;
    accessToken?: string;
    refreshToken?: string;
    requiresName?: boolean;
  }> => {
    return await apiRequest<{
      user?: User;
      accessToken?: string;
      refreshToken?: string;
      requiresName?: boolean;
    }>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phoneNumber, otp, name }),
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
 * Register and save FCM Token
 */
/**
 * Register OneSignal Player ID with backend
 */
export const registerOneSignalPlayerId = async (playerId: string): Promise<void> => {
  await apiRequest("/user/onesignal-player-id", {
    method: "POST",
    body: JSON.stringify({ playerId }),
  });
};

/**
 * @deprecated Use registerOneSignalPlayerId instead
 */
export const registerPushToken = async (token: string): Promise<void> => {
  try {
    await apiRequest("/user/fcm-token", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  } catch (error: any) {
    console.error("Error registering FCM token:", error);
    // Don't throw - push notifications are not critical
  }
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
  /**
   * Update user profile
   */
  updateProfile: async (updates: { name?: string }): Promise<User> => {
    return await apiRequest<User>("/user/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
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

  /**
   * Broadcast notification to all users (Super admin only)
   */
  broadcastNotification: async (title: string, body: string, data?: any): Promise<{
    sent: number;
    failed: number;
    total: number;
  }> => {
    return await apiRequest("/admin/notifications/broadcast", {
      method: "POST",
      body: JSON.stringify({ title, body, data }),
    });
  },

  /**
   * Send notification to specific user (Super admin only)
   */
  sendNotificationToUser: async (userId: string, title: string, body: string, data?: any): Promise<void> => {
    return await apiRequest("/admin/notifications/send", {
      method: "POST",
      body: JSON.stringify({ userId, title, body, data }),
    });
  },

  /**
   * Get all co-admins (Super admin only)
   */
  getCoAdmins: async (): Promise<Array<{
    id: string;
    phoneNumber: string;
    name: string;
    role: "admin";
    createdAt: string;
  }>> => {
    const response = await apiRequest<{ coAdmins: Array<{
      id: string;
      phoneNumber: string;
      name: string;
      role: "admin";
      createdAt: string;
    }> }>("/admin/co-admins", {
      method: "GET",
    });
    // Backend returns { success: true, data: { coAdmins: [...] } }
    // apiRequest extracts data, so response is { coAdmins: [...] }
    // Extract the coAdmins array
    if (response && typeof response === 'object' && 'coAdmins' in response) {
      return Array.isArray(response.coAdmins) ? response.coAdmins : [];
    }
    // If response is directly an array (fallback)
    if (Array.isArray(response)) {
      return response;
    }
    console.warn("Unexpected co-admins response structure:", response);
    return [];
  },

  /**
   * Appoint a co-admin (Super admin only)
   */
  appointCoAdmin: async (phoneNumber: string, name: string): Promise<{
    id: string;
    phoneNumber: string;
    name: string;
    role: "admin";
  }> => {
    return await apiRequest("/admin/co-admins", {
      method: "POST",
      body: JSON.stringify({ phoneNumber, name }),
    });
  },

  /**
   * Remove a co-admin (Super admin only)
   */
  removeCoAdmin: async (coAdminId: string): Promise<void> => {
    return await apiRequest(`/admin/co-admins/${coAdminId}`, {
      method: "DELETE",
    });
  },
};

/**
 * Coupon API
 */
export const couponApi = {
  /**
   * Get all coupons (Admin only) with pagination
   */
  getAllCoupons: async (options?: {
    limit?: number;
    lastDocId?: string;
  }): Promise<{
    coupons: Array<{
      id: string;
      code: string;
      discountType: "percentage" | "fixed";
      discountValue: number;
      minOrderAmount?: number;
      maxDiscountAmount?: number;
      maxUsage?: number;
      currentUsage: number;
      validFrom: string;
      validUntil: string;
      isActive: boolean;
    }>;
    hasMore: boolean;
    lastDocId?: string;
  }> => {
    const params = new URLSearchParams();
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.lastDocId) params.append("lastDocId", options.lastDocId);

    const queryString = params.toString();
    const endpoint = `/coupons${queryString ? `?${queryString}` : ""}`;

    const response = await apiRequest<{
      coupons: Array<{
        id: string;
        code: string;
        discountType: "percentage" | "fixed";
        discountValue: number;
        minOrderAmount?: number;
        maxDiscountAmount?: number;
        maxUsage?: number;
        currentUsage: number;
        validFrom: string;
        validUntil: string;
        isActive: boolean;
      }>;
      hasMore: boolean;
      lastDocId?: string;
    }>(endpoint, {
      method: "GET",
    });
    // Backend returns { success: true, data: { coupons: [...], hasMore, lastDocId } }
    // apiRequest extracts data, so response is { coupons: [...], hasMore, lastDocId }
    return {
      coupons: response.coupons || [],
      hasMore: response.hasMore || false,
      lastDocId: response.lastDocId,
    };
  },

  /**
   * Create a coupon (Admin only)
   */
  createCoupon: async (couponData: {
    code: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    minOrderAmount?: number;
    maxDiscountAmount?: number;
    maxUsage?: number;
    validFrom: string;
    validUntil: string;
  }): Promise<{
    id: string;
    code: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
  }> => {
    return await apiRequest("/coupons", {
      method: "POST",
      body: JSON.stringify(couponData),
    });
  },

  /**
   * Update a coupon (Admin only)
   */
  updateCoupon: async (couponId: string, updates: {
    discountType?: "percentage" | "fixed";
    discountValue?: number;
    minOrderAmount?: number;
    maxDiscountAmount?: number;
    maxUsage?: number;
    validFrom?: string;
    validUntil?: string;
    isActive?: boolean;
  }): Promise<any> => {
    return await apiRequest(`/coupons/${couponId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  /**
   * Delete a coupon (Admin only)
   */
  deleteCoupon: async (couponId: string): Promise<void> => {
    return await apiRequest(`/coupons/${couponId}`, {
      method: "DELETE",
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
    weight: number,
    pickupPincode?: string,
    dropPincode?: string,
    couponCode?: string,
    pickupCity?: string,
    dropCity?: string
  ): Promise<{
    distanceInKm: number;
    baseFare: number;
    gst: number;
    totalFare: number;
    finalFare?: number;
    discountAmount?: number;
    couponApplied?: {
      code: string;
      discountAmount: number;
    };
  }> => {
    return await apiRequest("/map/fare", {
      method: "POST",
      body: JSON.stringify({ 
        pickup, 
        drop, 
        weight, 
        pickupPincode, 
        dropPincode, 
        couponCode,
        pickupCity,
        dropCity,
      }),
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
   * Get all cities (Public endpoint - no auth required)
   */
  getCities: async (): Promise<{
    cities: Array<{
      id: string;
      name: string;
      state?: string;
      isActive: boolean;
    }>;
  }> => {
    return await apiRequest("/map/cities", {
      method: "GET",
    });
  },

  /**
   * Create a city (Admin only)
   */
  createCity: async (cityData: {
    name: string;
    state?: string;
  }): Promise<{
    city: {
      id: string;
      name: string;
      state?: string;
      isActive: boolean;
    };
  }> => {
    return await apiRequest("/admin/cities", {
      method: "POST",
      body: JSON.stringify(cityData),
    });
  },

  /**
   * Update a city (Admin only)
   */
  updateCity: async (cityId: string, updates: {
    name?: string;
    state?: string;
    isActive?: boolean;
  }): Promise<any> => {
    return await apiRequest(`/admin/cities/${cityId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  /**
   * Delete a city (Admin only)
   */
  deleteCity: async (cityId: string): Promise<void> => {
    return await apiRequest(`/admin/cities/${cityId}`, {
      method: "DELETE",
    });
  },

  /**
   * Get all city routes (Admin only)
   */
  getCityRoutes: async (): Promise<{
    routes: Array<{
      id: string;
      fromCity: string;
      toCity: string;
      baseFare: number;
      heavyFare: number;
      gstPercent: number;
      isActive: boolean;
    }>;
  }> => {
    return await apiRequest("/admin/cities/routes", {
      method: "GET",
    });
  },

  /**
   * Create or update city route (Admin only)
   */
  upsertCityRoute: async (routeData: {
    fromCity: string;
    toCity: string;
    baseFare: number;
    heavyFare: number;
    gstPercent?: number;
  }): Promise<any> => {
    return await apiRequest("/admin/cities/routes", {
      method: "POST",
      body: JSON.stringify(routeData),
    });
  },

  /**
   * Delete city route (Admin only)
   */
  deleteCityRoute: async (routeId: string): Promise<void> => {
    return await apiRequest(`/admin/cities/routes/${routeId}`, {
      method: "DELETE",
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

    await response.json();
  } catch (error: any) {
    if (__DEV__) {
      console.error(`[API Test] Connection failed:`, error);
      console.error(`[API Test] URL: ${apiConfig.baseUrl}/health`);
      console.error(`[API Test] Platform: ${Platform.OS}`);
    }
    throw error;
  }
};

