/**
 * Booking Store (Zustand)
 * Manages booking state
 */

import { create } from "zustand";
import { Booking, BookingStatus } from "../utils/types";

interface BookingState {
  bookings: Booking[];
  selectedBooking: Booking | null;
  loading: boolean;
  filters: {
    status?: BookingStatus;
    paymentStatus?: string;
    searchQuery?: string;
  };
  setBookings: (bookings: Booking[]) => void;
  addBooking: (booking: Booking) => void;
  updateBooking: (id: string, updates: Partial<Booking>) => void;
  setSelectedBooking: (booking: Booking | null) => void;
  setLoading: (loading: boolean) => void;
  setFilters: (filters: Partial<BookingState["filters"]>) => void;
  clearFilters: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  bookings: [],
  selectedBooking: null,
  loading: false,
  filters: {},
  setBookings: (bookings) => set({ bookings }),
  addBooking: (booking) =>
    set((state) => ({ bookings: [booking, ...state.bookings] })),
  updateBooking: (id, updates) =>
    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      ),
      selectedBooking:
        state.selectedBooking?.id === id
          ? { ...state.selectedBooking, ...updates }
          : state.selectedBooking,
    })),
  setSelectedBooking: (booking) => set({ selectedBooking: booking }),
  setLoading: (loading) => set({ loading }),
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  clearFilters: () => set({ filters: {} }),
}));

