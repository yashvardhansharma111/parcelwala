/**
 * TypeScript Interfaces and Types
 */

export type UserRole = "admin" | "customer";

export type BookingStatus = "PendingPayment" | "Created" | "Picked" | "Shipped" | "Delivered" | "Returned" | "Cancelled";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface User {
  id: string;
  phoneNumber: string;
  name?: string;
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

export type DeliveryType = "sameDay" | "later";

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
  deliveryType?: DeliveryType;
  deliveryDate?: Date | string;
  podSignature?: string; // Base64 encoded signature image
  podSignedAt?: Date | string;
  podSignedBy?: string; // Name of person who signed
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

