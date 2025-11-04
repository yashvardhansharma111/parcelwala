/**
 * TypeScript Interfaces and Types
 */

export type UserRole = "admin" | "customer";

export type BookingStatus = "PendingPayment" | "Created" | "Picked" | "Shipped" | "Delivered";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface User {
  id: string;
  phoneNumber: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  name: string;
  phone: string;
  houseNumber?: string;
  street?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
}

export interface ParcelDetails {
  type: string;
  weight: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  description?: string;
  value?: number;
}

export type PaymentMethod = "cod" | "online"; // Cash on Delivery or Online Payment

export interface Booking {
  id: string;
  userId: string;
  pickup: Address;
  drop: Address;
  parcelDetails: ParcelDetails;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  fare?: number;
  createdAt: Date;
  updatedAt: Date;
  trackingNumber?: string;
}

export interface PaymentIntent {
  id: string;
  bookingId: string;
  amount: number;
  status: PaymentStatus;
  transactionId?: string;
  createdAt: Date;
}

export interface FareSettings {
  baseFare: number;
  perKgRate: number;
  perKmRate: number;
  minFare: number;
}

