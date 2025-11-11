/**
 * Booking Service
 * Handles booking operations via backend API
 */

import { Booking, BookingStatus, PaymentStatus } from "../utils/types";
import { apiRequest } from "./apiClient";

/**
 * Create a new booking
 */
export const createBooking = async (
  bookingData: Omit<Booking, "id" | "userId" | "createdAt" | "updatedAt" | "trackingNumber" | "status" | "paymentStatus"> & {
    couponCode?: string;
    deliveryType?: "sameDay" | "later";
    deliveryDate?: string;
  }
): Promise<Booking> => {
  try {
    const requestBody: any = {
      pickup: bookingData.pickup,
      drop: bookingData.drop,
      parcelDetails: bookingData.parcelDetails,
      fare: bookingData.fare,
      paymentMethod: bookingData.paymentMethod,
    };
    
    if (bookingData.couponCode) {
      requestBody.couponCode = bookingData.couponCode;
    }
    
    if (bookingData.deliveryType) {
      requestBody.deliveryType = bookingData.deliveryType;
    }
    
    if (bookingData.deliveryDate) {
      requestBody.deliveryDate = bookingData.deliveryDate;
    }
    
    const response = await apiRequest<{ booking: Booking }>("/bookings", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    return response.booking;
  } catch (error: any) {
    throw new Error(error.message || "Failed to create booking");
  }
};

/**
 * Get booking by ID
 */
export const getBookingById = async (bookingId: string): Promise<Booking | null> => {
  try {
    const response = await apiRequest<{ booking: Booking }>(`/bookings/${bookingId}`, {
      method: "GET",
    });

    return response.booking;
  } catch (error: any) {
    if (error.message?.includes("404") || error.message?.includes("not found")) {
      return null;
    }
    throw new Error(error.message || "Failed to fetch booking");
  }
};

/**
 * Get all bookings for a user (with pagination)
 */
export const getUserBookings = async (options?: {
  limit?: number;
  lastDocId?: string;
}): Promise<{
  bookings: Booking[];
  hasMore: boolean;
  lastDocId?: string;
}> => {
  try {
    const params = new URLSearchParams();
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.lastDocId) params.append("lastDocId", options.lastDocId);

    const queryString = params.toString();
    const endpoint = `/bookings${queryString ? `?${queryString}` : ""}`;

    const response = await apiRequest<{
      bookings: Booking[];
      hasMore: boolean;
      lastDocId?: string;
    }>(endpoint, {
      method: "GET",
    });

    // Debug logging
    if (__DEV__) {
      console.log("[getUserBookings] API Response:", {
        bookingsCount: response?.bookings?.length || 0,
        hasMore: response?.hasMore,
        lastDocId: response?.lastDocId,
        responseKeys: Object.keys(response || {}),
        firstBooking: response?.bookings?.[0] ? {
          id: response.bookings[0].id,
          status: response.bookings[0].status,
          userId: response.bookings[0].userId,
        } : null,
      });
    }

    return {
      bookings: response?.bookings || [],
      hasMore: response?.hasMore || false,
      lastDocId: response?.lastDocId,
    };
  } catch (error: any) {
    throw new Error(error.message || "Failed to fetch bookings");
  }
};

/**
 * Get all bookings (Admin only) with pagination
 */
export const getAllBookings = async (
  filters?: {
    status?: BookingStatus;
    paymentStatus?: PaymentStatus;
  },
  options?: {
    limit?: number;
    lastDocId?: string;
  }
): Promise<{
  bookings: Booking[];
  hasMore: boolean;
  lastDocId?: string;
}> => {
  try {
    const queryParams = new URLSearchParams();
    if (filters?.status) queryParams.append("status", filters.status);
    if (filters?.paymentStatus) queryParams.append("paymentStatus", filters.paymentStatus);
    if (options?.limit) queryParams.append("limit", options.limit.toString());
    if (options?.lastDocId) queryParams.append("lastDocId", options.lastDocId);

    const queryString = queryParams.toString();
    const endpoint = `/bookings/admin/all${queryString ? `?${queryString}` : ""}`;

    const response = await apiRequest<{
      bookings: Booking[];
      hasMore: boolean;
      lastDocId?: string;
    }>(endpoint, {
      method: "GET",
    });

    return {
      bookings: response.bookings || [],
      hasMore: response.hasMore || false,
      lastDocId: response.lastDocId,
    };
  } catch (error: any) {
    throw new Error(error.message || "Failed to fetch bookings");
  }
};

/**
 * Update booking status
 */
export const updateBookingStatus = async (
  bookingId: string,
  status: BookingStatus,
  returnReason?: string
): Promise<Booking> => {
  try {
    const body: any = { status };
    if (returnReason) {
      body.returnReason = returnReason;
    }

    const response = await apiRequest<{ booking: Booking }>(
      `/bookings/${bookingId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      }
    );

    return response.booking;
  } catch (error: any) {
    throw new Error(error.message || "Failed to update booking status");
  }
};

/**
 * Update booking payment status
 */
export const updatePaymentStatus = async (
  bookingId: string,
  paymentStatus: PaymentStatus
): Promise<void> => {
  try {
    await apiRequest(`/bookings/${bookingId}/payment-status`, {
      method: "PATCH",
      body: JSON.stringify({ paymentStatus }),
    });
  } catch (error: any) {
    throw new Error(error.message || "Failed to update payment status");
  }
};

/**
 * Update POD signature (Admin only)
 */
export const updatePODSignature = async (
  bookingId: string,
  podSignature: string,
  podSignedBy: string
): Promise<Booking> => {
  try {
    const response = await apiRequest<{ booking: Booking }>(`/bookings/${bookingId}/pod`, {
      method: "PATCH",
      body: JSON.stringify({ podSignature, podSignedBy }),
    });

    return response.booking;
  } catch (error: any) {
    throw new Error(error.message || "Failed to update POD signature");
  }
};

/**
 * Update booking fare (Admin only)
 */
export const updateFare = async (
  bookingId: string,
  fare: number
): Promise<Booking> => {
  try {
    const response = await apiRequest<{ booking: Booking }>(`/bookings/${bookingId}/fare`, {
      method: "PATCH",
      body: JSON.stringify({ fare }),
    });

    return response.booking;
  } catch (error: any) {
    throw new Error(error.message || "Failed to update fare");
  }
};

/**
 * Subscribe to user bookings (real-time updates)
 * NOTE: Real-time subscriptions removed - use polling or websockets if needed
 * For now, this is a placeholder that just fetches bookings once
 */
export const subscribeToUserBookings = (
  userId: string,
  callback: (bookings: Booking[]) => void
): (() => void) => {
  // Fetch bookings initially
  getUserBookings()
    .then((result) => callback(result.bookings))
    .catch((error) => {
      console.error("Error fetching bookings:", error);
    });

  // Return empty unsubscribe function (no subscription)
  return () => {};
};

/**
 * Subscribe to all bookings (Admin - real-time updates)
 * NOTE: Real-time subscriptions removed - use polling or websockets if needed
 * For now, this is a placeholder that just fetches bookings once
 */
export const subscribeToAllBookings = (
  callback: (bookings: Booking[]) => void
): (() => void) => {
  // Fetch bookings initially
  getAllBookings()
    .then((result) => callback(result.bookings))
    .catch((error) => {
      console.error("Error fetching bookings:", error);
    });

  // Return empty unsubscribe function (no subscription)
  return () => {};
};

/**
 * Track booking by tracking number (Public - no auth required)
 */
export const trackBooking = async (trackingNumber: string): Promise<Booking | null> => {
  try {
    const response = await apiRequest<{ booking: Booking }>(`/bookings/track/${trackingNumber}`, {
      method: "GET",
    });

    return response.booking;
  } catch (error: any) {
    if (error.message?.includes("404") || error.message?.includes("not found")) {
      return null;
    }
    throw new Error(error.message || "Failed to track booking");
  }
};

/**
 * Search bookings (Admin only)
 */
export const searchBookings = async (
  searchQuery: string,
  filters?: {
    status?: BookingStatus;
    paymentStatus?: PaymentStatus;
  }
): Promise<Booking[]> => {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append("q", searchQuery);
    if (filters?.status) queryParams.append("status", filters.status);
    if (filters?.paymentStatus) queryParams.append("paymentStatus", filters.paymentStatus);

    const endpoint = `/bookings/admin/search?${queryParams.toString()}`;

    const response = await apiRequest<{ bookings: Booking[] }>(endpoint, {
      method: "GET",
    });

    return response.bookings || [];
  } catch (error: any) {
    throw new Error(error.message || "Failed to search bookings");
  }
};

/**
 * Get booking statistics (Admin only)
 */
export const getBookingStatistics = async (): Promise<{
  total: number;
  byStatus: Record<BookingStatus, number>;
  byPaymentStatus: Record<PaymentStatus, number>;
  recentBookings: Booking[];
}> => {
  try {
    const response = await apiRequest<{
      statistics: {
        total: number;
        byStatus: Record<BookingStatus, number>;
        byPaymentStatus: Record<PaymentStatus, number>;
        recentBookings: Booking[];
      };
    }>("/bookings/admin/statistics", {
      method: "GET",
    });

    return response.statistics;
  } catch (error: any) {
    throw new Error(error.message || "Failed to fetch booking statistics");
  }
};

/**
 * Cancel booking
 */
export const cancelBooking = async (
  bookingId: string,
  cancelReason?: string
): Promise<Booking> => {
  try {
    const body: any = { status: "Cancelled" };
    if (cancelReason) {
      body.returnReason = cancelReason; // Reuse returnReason field for cancel reason
    }

    const response = await apiRequest<{ booking: Booking }>(
      `/bookings/${bookingId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      }
    );

    return response.booking;
  } catch (error: any) {
    throw new Error(error.message || "Failed to cancel booking");
  }
};