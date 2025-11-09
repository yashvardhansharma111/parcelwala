/**
 * Booking Hook
 * Handles booking CRUD operations via backend API
 */

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "../store/authStore";
import { useBookingStore } from "../store/bookingStore";
import * as bookingService from "../services/bookingService";
import { Booking, BookingStatus, Address, ParcelDetails } from "../utils/types";

export const useBooking = () => {
  const { user } = useAuthStore();
  const {
    bookings,
    selectedBooking,
    loading,
    loadingMore,
    hasMore,
    lastDocId,
    setBookings,
    appendBookings,
    addBooking,
    updateBooking,
    setSelectedBooking,
    setLoading,
    setLoadingMore,
    setPagination,
  } = useBookingStore();

  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch bookings from backend API (with pagination support)
   */
  const fetchBookings = useCallback(async (options?: {
    limit?: number;
    lastDocId?: string;
    append?: boolean;
  }) => {
    if (!user) return;

    try {
      setError(null);
      if (!options?.append) {
        setLoading(true);
      }

      let result: {
        bookings: Booking[];
        hasMore: boolean;
        lastDocId?: string;
      };

      if (user.role === "admin") {
        result = await bookingService.getAllBookings(undefined, {
          limit: options?.limit || 20,
          lastDocId: options?.lastDocId,
        });
      } else {
        result = await bookingService.getUserBookings({
          limit: options?.limit || 20,
          lastDocId: options?.lastDocId,
        });
      }

      if (options?.append) {
        // Append to existing bookings
        appendBookings(result.bookings);
      } else {
        // Replace existing bookings
        setBookings(result.bookings);
      }
      
      // Update pagination state
      setPagination(result.hasMore, result.lastDocId);
    } catch (error: any) {
      setError(error.message || "Failed to fetch bookings");
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  }, [user, setBookings, setLoading]);

  // Fetch bookings when user logs in, clear when user logs out
  useEffect(() => {
    if (user) {
      // Clear old bookings first to prevent showing wrong user's bookings
      setBookings([]);
      setLoading(true); // Set loading immediately so skeleton shows
      // Fetch bookings immediately
      fetchBookings();
    } else {
      // Clear bookings when user logs out
      setBookings([]);
      setSelectedBooking(null);
      setLoading(false);
    }
  }, [user?.id, fetchBookings, setBookings, setSelectedBooking, setLoading]);

  const createBooking = async (data: {
    pickup: Address;
    drop: Address;
    parcelDetails: ParcelDetails;
    fare?: number;
    paymentMethod?: PaymentMethod;
    couponCode?: string;
    deliveryType?: "sameDay" | "later";
    deliveryDate?: string;
  }) => {
    try {
      if (!user) throw new Error("User not authenticated");

      setError(null);
      setLoading(true);

      const bookingData: Omit<Booking, "id" | "userId" | "createdAt" | "updatedAt" | "trackingNumber" | "status" | "paymentStatus"> = {
        pickup: data.pickup,
        drop: data.drop,
        parcelDetails: data.parcelDetails,
        fare: data.fare,
      };

      const booking = await bookingService.createBooking(bookingData);
      addBooking(booking);
      
      // Refresh bookings list after creating
      await fetchBookings();
      
      return booking;
    } catch (error: any) {
      setError(error.message || "Failed to create booking");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const fetchBooking = async (bookingId: string) => {
    try {
      setError(null);
      setLoading(true);
      const booking = await bookingService.getBookingById(bookingId);
      if (booking) {
        setSelectedBooking(booking);
      }
      return booking;
    } catch (error: any) {
      setError(error.message || "Failed to fetch booking");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (bookingId: string, status: BookingStatus, returnReason?: string) => {
    try {
      setError(null);
      setLoading(true);
      const updatedBooking = await bookingService.updateBookingStatus(bookingId, status, returnReason);
      updateBooking(bookingId, { 
        status,
        returnReason: updatedBooking.returnReason,
        returnedAt: updatedBooking.returnedAt,
      });
      
      // Refresh bookings list after updating
      await fetchBookings();
    } catch (error: any) {
      setError(error.message || "Failed to update booking status");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const trackBooking = async (trackingNumber: string) => {
    try {
      setError(null);
      setLoading(true);
      const booking = await bookingService.trackBooking(trackingNumber);
      if (booking) {
        setSelectedBooking(booking);
      }
      return booking;
    } catch (error: any) {
      setError(error.message || "Failed to track booking");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load more bookings (for infinite scroll)
   */
  const loadMoreBookings = useCallback(async () => {
    if (!user || !hasMore || loadingMore) return;

    try {
      setError(null);
      setLoadingMore(true);

      let result: {
        bookings: Booking[];
        hasMore: boolean;
        lastDocId?: string;
      };

      if (user.role === "admin") {
        result = await bookingService.getAllBookings(undefined, {
          limit: 20,
          lastDocId,
        });
      } else {
        result = await bookingService.getUserBookings({
          limit: 20,
          lastDocId,
        });
      }

      appendBookings(result.bookings);
      setPagination(result.hasMore, result.lastDocId);
    } catch (error: any) {
      setError(error.message || "Failed to load more bookings");
      console.error("Error loading more bookings:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [user, hasMore, lastDocId, loadingMore, appendBookings, setPagination]);

  return {
    bookings,
    selectedBooking,
    loading,
    loadingMore,
    hasMore,
    error,
    createBooking,
    fetchBooking,
    fetchBookings, // Expose fetchBookings for manual refresh
    loadMoreBookings, // Load more for infinite scroll
    trackBooking, // Track booking by tracking number
    updateStatus,
    setSelectedBooking,
  };
};
