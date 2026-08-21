/**
 * Validation utilities for the frontend.
 */

/**
 * Validates a phone number.
 * Supports international format.
 * @param phone The phone number string to validate.
 * @returns boolean indicating if the phone number is valid.
 */
export const validatePhone = (phone: string): boolean => {
  if (!phone) return true; // Optional field
  // Basic international phone regex: + followed by 7 to 15 digits
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  // Remove spaces, hyphens, and parentheses for validation
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  return phoneRegex.test(cleaned);
};
