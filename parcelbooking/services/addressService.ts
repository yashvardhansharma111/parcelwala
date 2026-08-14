/**
 * Address Service
 * Handles address autocomplete with debouncing
 */

import { mapApi } from "./apiClient";

export interface AddressSuggestion {
  displayName: string;
  placeId?: string;
  coordinates?: { lat: number; lon: number };
  address: {
    name: string;
    street?: string;
    houseNumber?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  source?: string;
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
 * Search cities across India (Photon-backed)
 */
export const searchIndiaCities = async (
  query: string,
  limit: number = 10
): Promise<
  Array<{
    id: string;
    name: string;
    state?: string;
    country?: string;
    lat?: number;
    lon?: number;
  }>
> => {
  try {
    if (!query || query.trim().length < 2) return [];
    const response = await mapApi.searchCities(query.trim(), limit);
    return response.cities || [];
  } catch (error: any) {
    throw new Error(error.message || "Failed to search cities");
  }
};

/**
 * Get address autocomplete suggestions
 */
export const getAutocompleteSuggestions = async (
  query: string,
  limit: number = 5,
  city?: string
): Promise<AddressSuggestion[]> => {
  try {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const response = await mapApi.autocomplete(query.trim(), limit, city);
    return response.suggestions || [];
  } catch (error: any) {
    throw new Error(error.message || "Failed to fetch address suggestions");
  }
};

/**
 * Resolve Google place_id to coordinates + address
 */
export const resolvePlaceDetails = async (
  placeId: string
): Promise<AddressSuggestion> => {
  const response = await mapApi.getPlaceDetails(placeId);
  return response.suggestion;
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
    throw new Error(error.message || "Failed to fetch address details");
  }
};

/**
 * Calculate fare for booking
 * Formula: base (≤2km) + ₹8/km after + handling (+ optional waiting)
 */
export const calculateFare = async (
  pickup: { lat: number; lon: number },
  drop: { lat: number; lon: number },
  weight: number,
  pickupPincode?: string,
  dropPincode?: string,
  couponCode?: string,
  pickupCity?: string,
  dropCity?: string,
  parcelType?: string
): Promise<{
  distanceInKm: number;
  baseFare: number;
  baseKmIncluded?: number;
  extraKm?: number;
  perKmRate?: number;
  perKmCharge?: number;
  waitingMinutes?: number;
  waitingCharge?: number;
  handlingFee?: number;
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
    return await mapApi.calculateFare(pickup, drop, weight, pickupPincode, dropPincode, couponCode, pickupCity, dropCity, parcelType);
  } catch (error: any) {
    throw new Error(error.message || "Failed to calculate fare");
  }
};

