/**
 * Coupon Service
 * Handles coupon code operations
 */

import { apiRequest } from "./apiClient";

export interface CouponValidationResult {
  isValid: boolean;
  coupon?: {
    code: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
  };
  discountAmount: number;
  message?: string;
}

/**
 * Validate coupon code
 */
export const validateCoupon = async (
  code: string,
  orderAmount: number
): Promise<CouponValidationResult> => {
  try {
    const response = await apiRequest<CouponValidationResult>("/coupons/validate", {
      method: "POST",
      body: JSON.stringify({
        code: code.trim().toUpperCase(),
        orderAmount,
      }),
    });

    return response;
  } catch (error: any) {
    return {
      isValid: false,
      discountAmount: 0,
      message: error.message || "Invalid coupon code",
    };
  }
};

