/**
 * UI Store (Zustand)
 * Manages UI state and preferences
 */

import { create } from "zustand";

interface UIState {
  isLoading: boolean;
  error: string | null;
  success: string | null;
  showToast: boolean;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSuccess: (success: string | null) => void;
  showError: (error: string) => void;
  showSuccess: (message: string) => void;
  clearToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isLoading: false,
  error: null,
  success: null,
  showToast: false,
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, showToast: !!error }),
  setSuccess: (success) => set({ success, showToast: !!success }),
  showError: (error) => set({ error, showToast: true }),
  showSuccess: (message) => set({ success: message, showToast: true }),
  clearToast: () => set({ error: null, success: null, showToast: false }),
}));

