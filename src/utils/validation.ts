/**
 * Input validation utilities
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates an email address
 */
export function validateEmail(email: string): ValidationResult {
  if (!email.trim()) {
    return { isValid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  return { isValid: true };
}

/**
 * Validates a phone number (flexible format)
 */
export function validatePhone(phone: string): ValidationResult {
  if (!phone.trim()) {
    return { isValid: true }; // Phone is often optional
  }

  // Remove common formatting characters
  const digitsOnly = phone.replace(/[\s\-\(\)\+\.]/g, '');

  if (digitsOnly.length < 7) {
    return { isValid: false, error: 'Phone number is too short' };
  }

  if (digitsOnly.length > 15) {
    return { isValid: false, error: 'Phone number is too long' };
  }

  if (!/^\d+$/.test(digitsOnly)) {
    return { isValid: false, error: 'Please enter a valid phone number' };
  }

  return { isValid: true };
}

/**
 * Validates a monetary amount
 */
export function validateAmount(amount: string): ValidationResult {
  if (!amount.trim()) {
    return { isValid: false, error: 'Amount is required' };
  }

  // Remove currency symbols and commas
  const cleanAmount = amount.replace(/[$€£¥,]/g, '').trim();

  const numValue = parseFloat(cleanAmount);
  if (isNaN(numValue)) {
    return { isValid: false, error: 'Please enter a valid number' };
  }

  if (numValue < 0) {
    return { isValid: false, error: 'Amount cannot be negative' };
  }

  if (numValue > 999999999) {
    return { isValid: false, error: 'Amount is too large' };
  }

  return { isValid: true };
}

/**
 * Validates a required field
 */
export function validateRequired(value: string, fieldName: string = 'This field'): ValidationResult {
  if (!value.trim()) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  return { isValid: true };
}

/**
 * Validates a URL
 */
export function validateUrl(url: string): ValidationResult {
  if (!url.trim()) {
    return { isValid: true }; // URL is often optional
  }

  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Please enter a valid URL' };
  }
}

/**
 * Validates a date string (YYYY-MM-DD format)
 */
export function validateDate(date: string): ValidationResult {
  if (!date.trim()) {
    return { isValid: false, error: 'Date is required' };
  }

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return { isValid: false, error: 'Please enter a valid date' };
  }

  return { isValid: true };
}

/**
 * Formats a phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, '');

  if (digitsOnly.length === 10) {
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  }

  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+1 (${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`;
  }

  return phone;
}

/**
 * Parses a monetary amount string to a number
 */
export function parseAmount(amount: string): number {
  const cleanAmount = amount.replace(/[$€£¥,\s]/g, '');
  return parseFloat(cleanAmount) || 0;
}
