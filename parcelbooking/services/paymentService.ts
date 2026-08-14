/**
 * Payment Service
 * PayU payment integration via backend API
 */

import { apiRequest } from "./apiClient";

interface CreatePaymentResponse {
  paymentUrl: string;
  merchantReferenceId: string;
  payuReferenceId?: string;
  /** @deprecated legacy field from PayGIC era */
  paygicReferenceId?: string;
  expiry: string;
  amount: string;
}

interface PaymentStatusResponse {
  status: "SUCCESS" | "FAILED" | "PENDING";
  message: string;
  amount?: number;
  payuReferenceId?: string;
  paygicReferenceId?: string;
  merchantReferenceId?: string;
  successDate?: number;
}

/**
 * Create payment page for a booking
 * For online payments, bookingData is provided and booking will be created after payment success
 * For existing bookings, bookingId is provided
 */
export const initiatePayment = async (
  bookingId: string | null,
  amount: number,
  customerPhone: string,
  customerName: string,
  customerEmail: string,
  bookingData?: {
    pickup: any;
    drop: any;
    parcelDetails: any;
    fare: number;
    couponCode?: string;
  }
): Promise<{ paymentUrl: string; transactionId: string }> => {
  try {
    const requestBody: any = {
      customerName,
      customerEmail,
      customerMobile: customerPhone,
    };

    if (bookingId) {
      requestBody.bookingId = bookingId;
    } else if (bookingData) {
      requestBody.bookingData = bookingData;
    } else {
      throw new Error("Either bookingId or bookingData is required");
    }

    const response = await apiRequest<CreatePaymentResponse>(
      "/api/payments/create",
      {
        method: "POST",
        body: JSON.stringify(requestBody),
      }
    );

    if (!response) {
      throw new Error("Invalid payment response: response is null or undefined");
    }

    if (!response.paymentUrl) {
      throw new Error(`Invalid payment response: missing paymentUrl. Response: ${JSON.stringify(response)}`);
    }

    if (!response.merchantReferenceId) {
      throw new Error(`Invalid payment response: missing merchantReferenceId. Response: ${JSON.stringify(response)}`);
    }

    return {
      paymentUrl: response.paymentUrl,
      transactionId: response.merchantReferenceId,
    };
  } catch (error: any) {
    throw new Error(error.message || "Failed to initiate payment");
  }
};

/**
 * Check payment status
 */
export const checkPaymentStatus = async (
  merchantReferenceId: string
): Promise<PaymentStatusResponse> => {
  try {
    const response = await apiRequest<PaymentStatusResponse>(
      "/api/payments/status",
      {
        method: "POST",
        body: JSON.stringify({
          merchantReferenceId,
        }),
      }
    );

    return response;
  } catch (error: any) {
    throw new Error(error.message || "Failed to check payment status");
  }
};

/**
 * Complete payment and verify status
 */
export const completePayment = async (
  bookingId: string,
  merchantReferenceId: string
): Promise<void> => {
  try {
    const paymentResult = await checkPaymentStatus(merchantReferenceId);

    if (paymentResult.status === "SUCCESS") {
      return;
    } else if (paymentResult.status === "FAILED") {
      throw new Error("Payment failed. Please try again.");
    } else if (paymentResult.status === "PENDING") {
      return;
    } else {
      throw new Error(`Payment status unknown: ${paymentResult.status}`);
    }
  } catch (error: any) {
    if (error.message?.includes("pending") || error.message?.includes("Pending")) {
      return;
    }
    throw error;
  }
};
