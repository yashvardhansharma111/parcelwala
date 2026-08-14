/**
 * Google Maps config (Android Maps SDK)
 * Address autocomplete uses backend Google Places (GOOGLE_MAPS_API_KEY) with Photon fallback.
 */

import Constants from "expo-constants";

export const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  (Constants.expoConfig?.extra as any)?.googleMapsApiKey ||
  (Constants.expoConfig?.android as any)?.config?.googleMaps?.apiKey ||
  "";
