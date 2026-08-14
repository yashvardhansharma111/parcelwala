/**
 * Booking Draft Store (Zustand)
 * Hyperlocal: pickup+drop → confirm
 * Intercity: pickup → drop → parcel
 */

import { create } from "zustand";
import { Address, ParcelDetails, PaymentMethod } from "../utils/types";

export type Coords = { lat: number; lon: number };
export type ServiceType = "hyperlocal" | "intercity";

const emptyAddress = (phone = ""): Address => ({
  name: "",
  phone,
  houseNumber: "",
  street: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  landmark: "",
});

const emptyParcel = (): ParcelDetails => ({
  type: "Package",
  weight: 1,
  description: "",
  value: 0,
});

interface BookingDraftState {
  serviceType: ServiceType;
  pickup: Address;
  pickupCoords: Coords | null;
  drop: Address;
  dropCoords: Coords | null;
  parcelDetails: ParcelDetails;
  couponCode: string;
  paymentMethod: PaymentMethod;
  setServiceType: (serviceType: ServiceType) => void;
  setPickup: (pickup: Address, coords: Coords | null) => void;
  setDrop: (drop: Address, coords: Coords | null) => void;
  setParcelDetails: (parcelDetails: ParcelDetails) => void;
  setCouponCode: (couponCode: string) => void;
  setPaymentMethod: (paymentMethod: PaymentMethod) => void;
  resetDraft: (defaultPhone?: string) => void;
}

export const useBookingDraftStore = create<BookingDraftState>((set) => ({
  serviceType: "hyperlocal",
  pickup: emptyAddress(),
  pickupCoords: null,
  drop: emptyAddress(),
  dropCoords: null,
  parcelDetails: emptyParcel(),
  couponCode: "",
  paymentMethod: "cod",
  setServiceType: (serviceType) => set({ serviceType }),
  setPickup: (pickup, coords) => set({ pickup, pickupCoords: coords }),
  setDrop: (drop, coords) => set({ drop, dropCoords: coords }),
  setParcelDetails: (parcelDetails) => set({ parcelDetails }),
  setCouponCode: (couponCode) => set({ couponCode }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  resetDraft: (defaultPhone = "") =>
    set({
      serviceType: "hyperlocal",
      pickup: emptyAddress(defaultPhone),
      pickupCoords: null,
      drop: emptyAddress(),
      dropCoords: null,
      parcelDetails: emptyParcel(),
      couponCode: "",
      paymentMethod: "cod",
    }),
}));
