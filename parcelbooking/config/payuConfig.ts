/**
 * PayU Payment Gateway Configuration
 * Client only needs public flags; secrets stay on the backend.
 */

export const payuConfig = {
  /** Present for docs / future client SDK; live keys are server-side */
  merchantKey: process.env.EXPO_PUBLIC_PAYU_KEY || "",
  environment: process.env.EXPO_PUBLIC_PAYU_ENV || "production",
};
