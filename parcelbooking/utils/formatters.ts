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

/**
 * Sanitize error messages to remove backend URLs and sensitive information
 * This prevents exposing server details to users
 */
export const sanitizeErrorMessage = (errorMessage: string | null | undefined): string => {
  if (!errorMessage) {
    return "An error occurred. Please try again.";
  }

  let sanitized = errorMessage;

  // Remove HTTP/HTTPS URLs
  sanitized = sanitized.replace(/https?:\/\/[^\s]+/gi, "[server]");
  
  // Remove IP addresses (IPv4)
  sanitized = sanitized.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?\b/g, "[server]");
  
  // Remove localhost references
  sanitized = sanitized.replace(/localhost[^\s]*/gi, "[server]");
  
  // Remove ngrok URLs
  sanitized = sanitized.replace(/ngrok[^\s]*/gi, "[server]");
  
  // Remove domain names (common TLDs)
  sanitized = sanitized.replace(/[a-zA-Z0-9-]+\.(com|net|org|in|io|dev|app|xyz|co|me|info|tech|online)[^\s]*/gi, "[server]");
  
  // Remove port numbers that might be exposed
  sanitized = sanitized.replace(/:\d{4,5}\b/g, "");
  
  // Remove common error patterns that might contain URLs
  sanitized = sanitized.replace(/at\s+https?:\/\/[^\s]+/gi, "at [server]");
  sanitized = sanitized.replace(/fetching\s+https?:\/\/[^\s]+/gi, "fetching from [server]");
  sanitized = sanitized.replace(/request\s+to\s+https?:\/\/[^\s]+/gi, "request to [server]");

  // Trim and return, or provide fallback
  sanitized = sanitized.trim();
  
  return sanitized || "An error occurred. Please try again.";
};

