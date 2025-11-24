/**
 * Address Service
 * Handles address autocomplete with debouncing
 */

import { mapApi } from "./apiClient";

export interface AddressSuggestion {
  displayName: string;
  coordinates: { lat: number; lon: number };
  address: {
    name: string;
    street?: string;
    houseNumber?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

export interface AddressDetails {
  name: string;
  houseNumber?: string;
  street?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  coordinates: { lat: number; lon: number };
}

/**
 * Debounce utility factory
 * Creates a debounced version of a function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

/**
 * Get address autocomplete suggestions
 */
export const getAutocompleteSuggestions = async (
  query: string,
  limit: number = 5
): Promise<AddressSuggestion[]> => {
  try {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const response = await mapApi.autocomplete(query.trim(), limit);
    return response.suggestions || [];
  } catch (error: any) {
    console.error("Error fetching autocomplete suggestions:", error);
    throw new Error(error.message || "Failed to fetch address suggestions");
  }
};

/**
 * Get full address details from coordinates
 */
export const getAddressDetails = async (
  lat: number,
  lon: number
): Promise<AddressDetails> => {
  try {
    const response = await mapApi.getAddressDetails(lat, lon);
    return response.address;
  } catch (error: any) {
    console.error("Error fetching address details:", error);
    throw new Error(error.message || "Failed to fetch address details");
  }
};

/**
 * Calculate fare for booking
 */
export const calculateFare = async (
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
  try {
    return await mapApi.calculateFare(pickup, drop, weight, pickupPincode, dropPincode, couponCode, pickupCity, dropCity);
  } catch (error: any) {
    console.error("Error calculating fare:", error);
    throw new Error(error.message || "Failed to calculate fare");
  }
};

