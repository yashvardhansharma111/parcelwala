/**
 * Application Constants
 */

import { BookingStatus, PaymentStatus } from "./types";


export const STATUS_TYPES: BookingStatus[] = [
  "PendingPayment",
  "Created",
  "Picked",
  "Shipped",
  "Delivered",
  "Returned",
  "Cancelled",
  "DeliveryFailed",
  "ReturnInProgress",
];

export const PAYMENT_STATUS_TYPES: PaymentStatus[] = [
  "pending",
  "paid",
  "failed",
  "refunded",
];

export const STATUS_COLORS: Record<BookingStatus, string> = {
  PendingPayment: "#F59E0B",
  Created: "#3B82F6",
  Picked: "#F59E0B",
  Shipped: "#8B5CF6",
  Delivered: "#10B981",
  Returned: "#EF4444",
  Cancelled: "#6B7280",
  DeliveryFailed: "#DC2626",
  ReturnInProgress: "#F97316",
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
  CUSTOMER_HOME: "/(customer)/(tabs)",
  CUSTOMER_BOOKING_NEW: "/(customer)/booking/new",
  CUSTOMER_BOOKING_TRACK: "/(customer)/booking/track",
  CUSTOMER_BOOKING_HISTORY: "/(customer)/booking/history",
  CUSTOMER_PAYMENT: "/(customer)/payment",
};

