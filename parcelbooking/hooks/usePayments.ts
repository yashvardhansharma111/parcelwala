/**
 * Payment Hook
 * Handles PayGIC payment flow
 */

import { useState } from "react";
import { useRouter } from "expo-router";
import * as paymentService from "../services/paymentService";
import { Booking } from "../utils/types";

export const usePayments = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiatePayment = async (
    booking: Booking | null,
    customerPhone: string,
    customerName?: string,
    customerEmail?: string,
    bookingData?: {
      pickup: any;
      drop: any;
      parcelDetails: any;
      fare: number;
      couponCode?: string;
    }
  ): Promise<{ paymentUrl: string; transactionId: string }> => {
    try {
      setError(null);
      setLoading(true);

      const fare = booking?.fare || bookingData?.fare;
      if (!fare || fare <= 0) {
        throw new Error("Booking fare not found");
      }

      // Use pickup address name and email if available, otherwise use provided values
      const name = customerName || booking?.pickup?.name || bookingData?.pickup?.name || "Customer";
      const email = customerEmail || `${customerPhone.replace(/\D/g, "")}@parcelapp.com`;

      if (booking) {
        console.log("[usePayments] Initiating payment for booking:", booking.id);
      } else {
        console.log("[usePayments] Initiating payment for new booking (will be created after payment)");
      }
      
      const result = await paymentService.initiatePayment(
        booking?.id || null,
        fare,
        customerPhone,
        name,
        email,
        bookingData
      );

      console.log("[usePayments] Payment initiated successfully:", {
        hasPaymentUrl: !!result.paymentUrl,
        hasTransactionId: !!result.transactionId,
        paymentUrl: result.paymentUrl?.substring(0, 50) + "...",
      });

      return result;
    } catch (error: any) {
      setError(error.message || "Failed to initiate payment");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const verifyAndCompletePayment = async (
    bookingId: string,
    transactionId: string
  ): Promise<void> => {
    try {
      setError(null);
      setLoading(true);
      await paymentService.completePayment(bookingId, transactionId);
      router.push("/(customer)/payment/success");
    } catch (error: any) {
      setError(error.message || "Failed to complete payment");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    initiatePayment,
    verifyAndCompletePayment,
  };
};

