/**
 * Authentication Store (Zustand)
 * Manages user authentication state
 */

import { create } from "zustand";
import { User, UserRole } from "../utils/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  isAuthenticated: false,
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
    }),
  setLoading: (loading) => set({ loading }),
  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
    }),
}));

