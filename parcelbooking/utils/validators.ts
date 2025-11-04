/**
 * Validation utility functions
 */

export const validatePhoneNumber = (phone: string): boolean => {
  if (!phone || typeof phone !== "string") {
    return false;
  }
  
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[\s-]/g, "");
  
  // Indian phone number format: +91 followed by 10 digits (starting with 6-9)
  // Accept formats: +91XXXXXXXXXX or +91 XXXXXXXXXX
  const phoneRegex = /^\+91[6-9]\d{9}$/;
  return phoneRegex.test(cleaned);
};

export const validatePinCode = (pincode: string): boolean => {
  // Indian PIN code format: 6 digits
  const pincodeRegex = /^\d{6}$/;
  return pincodeRegex.test(pincode);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateAddress = (address: {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!address.name || address.name.trim().length < 2) {
    errors.push("Name must be at least 2 characters");
  }

  if (!validatePhoneNumber(address.phone)) {
    errors.push("Invalid phone number format");
  }

  if (!address.address || address.address.trim().length < 10) {
    errors.push("Address must be at least 10 characters");
  }

  if (!address.city || address.city.trim().length < 2) {
    errors.push("City is required");
  }

  if (!address.state || address.state.trim().length < 2) {
    errors.push("State is required");
  }

  if (!validatePinCode(address.pincode)) {
    errors.push("Invalid PIN code format");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

