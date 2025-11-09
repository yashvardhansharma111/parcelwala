/**
 * Application Constants
 */

import { BookingStatus, PaymentStatus } from "./types";

// Note: This should match ADMIN_PHONE_NUMBER from backend .env
// The actual value is checked against backend AppCreds.admin.phoneNumber
export const ADMIN_PHONE_NUMBER = process.env.EXPO_PUBLIC_ADMIN_PHONE_NUMBER || "+911234567890";

export const STATUS_TYPES: BookingStatus[] = [
  "PendingPayment",
  "Created",
  "Picked",
  "Shipped",
  "Delivered",
  "Returned",
  "Cancelled",
];

export const PAYMENT_STATUS_TYPES: PaymentStatus[] = [
  "pending",
  "paid",
  "failed",
  "refunded",
];

export const STATUS_COLORS: Record<BookingStatus, string> = {
  PendingPayment: "#F59E0B", // Amber
  Created: "#3B82F6", // Blue
  Picked: "#F59E0B", // Amber
  Shipped: "#8B5CF6", // Purple
  Delivered: "#10B981", // Green
  Returned: "#EF4444", // Red
  Cancelled: "#6B7280", // Gray
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  pending: "#F59E0B",
  paid: "#10B981",
  failed: "#EF4444",
  refunded: "#6B7280",
};

export const FIRESTORE_COLLECTIONS = {
  USERS: "users",
  BOOKINGS: "bookings",
  PAYMENTS: "payments",
  FARES: "fares",
};

export const NAVIGATION_ROUTES = {
  LOGIN: "/login",
  CUSTOMER_HOME: "/(customer)/home",
  CUSTOMER_BOOKING_NEW: "/(customer)/booking/new",
  CUSTOMER_BOOKING_TRACK: "/(customer)/booking/track",
  CUSTOMER_BOOKING_HISTORY: "/(customer)/booking/history",
  CUSTOMER_PAYMENT: "/(customer)/payment",
  ADMIN_DASHBOARD: "/(admin)/dashboard",
  ADMIN_BOOKING_DETAILS: "/(admin)/bookingDetails",
  ADMIN_REPORTS: "/(admin)/reports",
  ADMIN_SETTINGS: "/(admin)/settings",
};

