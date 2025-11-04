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
    setBookings,
    addBooking,
    updateBooking,
    setSelectedBooking,
    setLoading,
  } = useBookingStore();

  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch bookings from backend API
   */
  const fetchBookings = useCallback(async () => {
    if (!user) return;

    try {
      setError(null);
      setLoading(true);

      let bookingsData: Booking[];

      if (user.role === "admin") {
        bookingsData = await bookingService.getAllBookings();
      } else {
        bookingsData = await bookingService.getUserBookings();
      }

      setBookings(bookingsData);
    } catch (error: any) {
      setError(error.message || "Failed to fetch bookings");
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  }, [user, setBookings, setLoading]);

  // Fetch bookings when user logs in
  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user, fetchBookings]);

  const createBooking = async (data: {
    pickup: Address;
    drop: Address;
    parcelDetails: ParcelDetails;
    fare?: number;
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

  const updateStatus = async (bookingId: string, status: BookingStatus) => {
    try {
      setError(null);
      setLoading(true);
      await bookingService.updateBookingStatus(bookingId, status);
      updateBooking(bookingId, { status });
      
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

  return {
    bookings,
    selectedBooking,
    loading,
    error,
    createBooking,
    fetchBooking,
    fetchBookings, // Expose fetchBookings for manual refresh
    trackBooking, // Track booking by tracking number
    updateStatus,
    setSelectedBooking,
  };
};
