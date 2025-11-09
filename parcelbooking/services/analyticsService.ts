/**
 * Analytics Service
 * Handles analytics API calls
 */

import { apiRequest } from "./apiClient";

export interface DashboardAnalytics {
  userCount: number;
  totalBookings: number;
  todayBookings: number;
  inTransitBookings: number;
  deliveredBookings: number;
  cancelledBookings: number;
  dailyRevenue: number;
  monthlyRevenue: number;
  totalRevenue: number;
}

export interface CustomerSummary {
  userId: string;
  phoneNumber: string;
  name?: string;
  totalBookings: number;
  lifetimeSpend: number;
  complaints: number;
  lastBookingDate?: string;
}

export interface RevenueData {
  date: string;
  revenue: number;
  bookings: number;
}

export interface FailedDelivery {
  bookingId: string;
  trackingNumber?: string;
  customerPhone: string;
  customerName: string;
  status: string;
  fare?: number;
  createdAt: string;
}

export interface CustomerAnalytics {
  userId: string;
  phoneNumber: string;
  name?: string;
  totalBookings: number;
  lifetimeSpend: number;
  bookings: any[];
  complaints: number;
}

/**
 * Get dashboard analytics
 */
export const getDashboardAnalytics = async (): Promise<DashboardAnalytics> => {
  return await apiRequest<DashboardAnalytics>("/analytics/dashboard", {
    method: "GET",
  });
};

/**
 * Get all customers with summary
 */
export const getAllCustomers = async (): Promise<CustomerSummary[]> => {
  return await apiRequest<CustomerSummary[]>("/analytics/customers", {
    method: "GET",
  });
};

/**
 * Get customer analytics
 */
export const getCustomerAnalytics = async (
  userId: string
): Promise<CustomerAnalytics> => {
  return await apiRequest<CustomerAnalytics>(`/analytics/customers/${userId}`, {
    method: "GET",
  });
};

/**
 * Get revenue analytics
 */
export const getRevenueAnalytics = async (
  days: number = 30
): Promise<RevenueData[]> => {
  return await apiRequest<RevenueData[]>(`/analytics/revenue?days=${days}`, {
    method: "GET",
  });
};

/**
 * Get failed deliveries and returns
 */
export const getFailedDeliveries = async (): Promise<FailedDelivery[]> => {
  return await apiRequest<FailedDelivery[]>("/analytics/failed-deliveries", {
    method: "GET",
  });
};

