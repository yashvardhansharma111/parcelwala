/**
 * Utility functions for formatting data
 */

import { BookingStatus, PaymentStatus } from "./types";

export const formatDate = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatDateTime = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return "";
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, "");
  
  // If starts with 91, keep it
  if (cleaned.startsWith("91") && cleaned.length >= 12) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7, 12)}`;
  }
  
  // If 10 digits, add +91 prefix
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  
  // If already has +91 format, return as is
  if (phone.startsWith("+91")) {
    return phone;
  }
  
  return phone;
};

/**
 * Auto-add +91 prefix to phone number if not present
 */
export const ensurePhonePrefix = (phone: string): string => {
  if (!phone) return "";
  
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, "");
  
  // If already starts with 91, return formatted
  if (cleaned.startsWith("91") && cleaned.length >= 12) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7, 12)}`;
  }
  
  // If 10 digits, add +91
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  
  // If already formatted with +91, return as is
  if (phone.startsWith("+91")) {
    return phone;
  }
  
  // Default: try to format as +91
  if (cleaned.length >= 10) {
    const digits = cleaned.slice(-10); // Take last 10 digits
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  
  return phone;
};

/**
 * Format phone number for display (always show +91)
 */
export const displayPhoneNumber = (phone: string): string => {
  if (!phone) return "";
  
  // If already has +91, return as is
  if (phone.startsWith("+91")) {
    return phone;
  }
  
  // Remove all non-digits and format
  const cleaned = phone.replace(/\D/g, "");
  
  if (cleaned.length >= 10) {
    const digits = cleaned.slice(-10); // Take last 10 digits
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  
  return phone;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatStatus = (status: BookingStatus | PaymentStatus): string => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export const generateTrackingNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PKG${timestamp}${random}`;
};

