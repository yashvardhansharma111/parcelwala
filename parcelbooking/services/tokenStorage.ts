/**
 * Token Storage Service
 * Manages JWT tokens in secure storage
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS_TOKEN_KEY = "@parcel_booking:access_token";
const REFRESH_TOKEN_KEY = "@parcel_booking:refresh_token";
const USER_KEY = "@parcel_booking:user";

export interface TokenStorage {
  accessToken: string | null;
  refreshToken: string | null;
  user: any | null;
}

/**
 * Store access token
 */
export const setAccessToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
  } catch (error) {
    console.error("Error storing access token:", error);
    throw new Error("Failed to store access token");
  }
};

/**
 * Get access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error("Error retrieving access token:", error);
    return null;
  }
};

/**
 * Store refresh token
 */
export const setRefreshToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
  } catch (error) {
    console.error("Error storing refresh token:", error);
    throw new Error("Failed to store refresh token");
  }
};

/**
 * Get refresh token
 */
export const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error("Error retrieving refresh token:", error);
    return null;
  }
};

/**
 * Store user data
 */
export const setUser = async (user: any): Promise<void> => {
  try {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error("Error storing user:", error);
    throw new Error("Failed to store user data");
  }
};

/**
 * Get user data
 */
export const getUser = async (): Promise<any | null> => {
  try {
    const userStr = await AsyncStorage.getItem(USER_KEY);
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch (error) {
    console.error("Error retrieving user:", error);
    return null;
  }
};

/**
 * Clear all tokens and user data
 */
export const clearTokens = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      ACCESS_TOKEN_KEY,
      REFRESH_TOKEN_KEY,
      USER_KEY,
    ]);
  } catch (error) {
    console.error("Error clearing tokens:", error);
    throw new Error("Failed to clear tokens");
  }
};

/**
 * Get all stored tokens
 */
export const getAllTokens = async (): Promise<TokenStorage> => {
  try {
    const [accessToken, refreshToken, userStr] = await AsyncStorage.multiGet([
      ACCESS_TOKEN_KEY,
      REFRESH_TOKEN_KEY,
      USER_KEY,
    ]);

    return {
      accessToken: accessToken[1],
      refreshToken: refreshToken[1],
      user: userStr[1] ? JSON.parse(userStr[1]) : null,
    };
  } catch (error) {
    console.error("Error retrieving tokens:", error);
    return {
      accessToken: null,
      refreshToken: null,
      user: null,
    };
  }
};

