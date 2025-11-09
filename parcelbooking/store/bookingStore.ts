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
  loadingMore: boolean;
  hasMore: boolean;
  lastDocId?: string;
  filters: {
    status?: BookingStatus;
    paymentStatus?: string;
    searchQuery?: string;
  };
  setBookings: (bookings: Booking[]) => void;
  appendBookings: (bookings: Booking[]) => void;
  addBooking: (booking: Booking) => void;
  updateBooking: (id: string, updates: Partial<Booking>) => void;
  setSelectedBooking: (booking: Booking | null) => void;
  setLoading: (loading: boolean) => void;
  setLoadingMore: (loading: boolean) => void;
  setPagination: (hasMore: boolean, lastDocId?: string) => void;
  setFilters: (filters: Partial<BookingState["filters"]>) => void;
  clearFilters: () => void;
  clearBookings: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  bookings: [],
  selectedBooking: null,
  loading: false,
  loadingMore: false,
  hasMore: false,
  lastDocId: undefined,
  filters: {},
  setBookings: (bookings) => set({ bookings, hasMore: false, lastDocId: undefined }),
  appendBookings: (bookings) =>
    set((state) => ({ bookings: [...state.bookings, ...bookings] })),
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
  setLoadingMore: (loadingMore) => set({ loadingMore }),
  setPagination: (hasMore, lastDocId) => set({ hasMore, lastDocId }),
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  clearFilters: () => set({ filters: {} }),
  clearBookings: () => set({ bookings: [], selectedBooking: null, hasMore: false, lastDocId: undefined }),
}));

