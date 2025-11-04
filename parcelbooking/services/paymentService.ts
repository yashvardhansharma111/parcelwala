/**
 * Payment Service
 * Handles PayGIC payment integration via backend API
 */

import { apiRequest } from "./apiClient";

interface CreatePaymentResponse {
  paymentUrl: string;
  merchantReferenceId: string;
  paygicReferenceId: string;
  expiry: string;
  amount: string;
}

interface PaymentStatusResponse {
  status: "SUCCESS" | "FAILED" | "PENDING";
  message: string;
  amount?: number;
  paygicReferenceId?: string;
  merchantReferenceId?: string;
  successDate?: number;
}

/**
 * Create payment page for a booking
 */
export const initiatePayment = async (
  bookingId: string,
  amount: number,
  customerPhone: string,
  customerName: string,
  customerEmail: string
): Promise<{ paymentUrl: string; transactionId: string }> => {
  try {
    // apiRequest already extracts the 'data' field from the backend response
    // So response is already the CreatePaymentResponse object
    const response = await apiRequest<CreatePaymentResponse>(
      "/api/payments/create",
      {
        method: "POST",
        body: JSON.stringify({
          bookingId,
          customerName,
          customerEmail,
          customerMobile: customerPhone,
        }),
      }
    );

    // Debug: Log the response
    console.log("[PaymentService] Received response:", JSON.stringify(response, null, 2));
    
    // Response is already the data object, so access properties directly
    if (!response) {
      console.error("[PaymentService] Response is null or undefined");
      throw new Error("Invalid payment response: response is null or undefined");
    }

    if (!response.paymentUrl) {
      console.error("[PaymentService] Payment response missing paymentUrl:", response);
      throw new Error(`Invalid payment response: missing paymentUrl. Response: ${JSON.stringify(response)}`);
    }

    if (!response.merchantReferenceId) {
      console.error("[PaymentService] Payment response missing merchantReferenceId:", response);
      throw new Error(`Invalid payment response: missing merchantReferenceId. Response: ${JSON.stringify(response)}`);
    }

    console.log("[PaymentService] Successfully extracted paymentUrl:", response.paymentUrl);
    
    return {
      paymentUrl: response.paymentUrl,
      transactionId: response.merchantReferenceId,
    };
  } catch (error: any) {
    console.error("Payment initiation error:", error);
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
    // apiRequest already extracts the 'data' field from the backend response
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

    console.log("[PaymentService] Payment status check result:", paymentResult);

    if (paymentResult.status === "SUCCESS") {
      // Payment successful - backend webhook should have already updated the status
      return;
    } else if (paymentResult.status === "FAILED") {
      throw new Error("Payment failed. Please try again.");
    } else if (paymentResult.status === "PENDING") {
      // PENDING status - payment might still be processing
      // Don't throw error, just return - webhook will update when payment completes
      console.log("[PaymentService] Payment is still pending, will be updated by webhook");
      return;
    } else {
      // Unknown status
      throw new Error(`Payment status unknown: ${paymentResult.status}`);
    }
  } catch (error: any) {
    console.error("[PaymentService] Payment verification error:", error);
    // If error message indicates pending status, don't throw
    if (error.message?.includes("pending") || error.message?.includes("Pending")) {
      console.log("[PaymentService] Payment appears to be pending, not throwing error");
      return;
    }
    throw error;
  }
};

