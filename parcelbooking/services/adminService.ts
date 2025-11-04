/**
 * Admin Service
 * Handles admin-specific operations via backend API
 */

import { updateBookingStatus } from "./bookingService";
import { BookingStatus } from "../utils/types";
import { apiRequest } from "./apiClient";

/**
 * Update booking status (Admin operation)
 * Note: This is now handled by bookingService.updateBookingStatus
 * Keeping this for backward compatibility
 */
export const updateBookingStatusAdmin = async (
  bookingId: string,
  status: BookingStatus
): Promise<void> => {
  try {
    await updateBookingStatus(bookingId, status);
  } catch (error: any) {
    throw new Error(error.message || "Failed to update booking status");
  }
};

/**
 * Fare Settings Interface
 */
export interface FareSettings {
  baseFare: number;
  perKgRate: number;
  perKmRate: number;
  minFare: number;
}

/**
 * Get fare settings
 * TODO: Create backend API endpoint for fare settings
 * For now, returns default settings
 */
export const getFareSettings = async (): Promise<FareSettings> => {
  try {
    // TODO: Replace with backend API call
    // const response = await apiRequest<{ settings: FareSettings }>("/admin/settings/fares", {
    //   method: "GET",
    // });
    // return response.settings;

    // Default fare settings for now
    const defaultFares: FareSettings = {
      baseFare: 50,
      perKgRate: 10,
      perKmRate: 5,
      minFare: 100,
    };

    return defaultFares;
  } catch (error: any) {
    // Return defaults on error
    return {
      baseFare: 50,
      perKgRate: 10,
      perKmRate: 5,
      minFare: 100,
    };
  }
};

/**
 * Update fare settings
 * TODO: Create backend API endpoint for fare settings
 */
export const updateFareSettings = async (
  settings: FareSettings
): Promise<void> => {
  try {
    // TODO: Replace with backend API call
    // await apiRequest("/admin/settings/fares", {
    //   method: "PUT",
    //   body: JSON.stringify(settings),
    // });

    // For now, just validate (backend API not implemented yet)
    if (
      settings.baseFare < 0 ||
      settings.perKgRate < 0 ||
      settings.perKmRate < 0 ||
      settings.minFare < 0
    ) {
      throw new Error("All fare values must be positive");
    }

    // In a real implementation, this would call the backend API
    console.warn("Fare settings update - backend API not implemented yet");
  } catch (error: any) {
    throw new Error(error.message || "Failed to update fare settings");
  }
};

/**
 * Calculate booking fare
 */
export const calculateFare = async (
  weight: number,
  distance?: number
): Promise<number> => {
  try {
    const fareSettings = await getFareSettings();
    let fare = fareSettings.baseFare;

    // Add weight-based fare
    fare += weight * fareSettings.perKgRate;

    // Add distance-based fare (if provided)
    if (distance) {
      fare += distance * fareSettings.perKmRate;
    }

    // Ensure minimum fare
    return Math.max(fare, fareSettings.minFare);
  } catch (error: any) {
    throw new Error(error.message || "Failed to calculate fare");
  }
};
