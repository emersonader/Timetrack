import { ValidationErrors, CreateClientInput } from '../types';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation regex (accepts various formats)
const PHONE_REGEX = /^[\d\s\-+()]{7,20}$/;

// ZIP code validation (US format)
const ZIP_REGEX = /^\d{5}(-\d{4})?$/;

// State abbreviation validation (US 2-letter)
const STATE_REGEX = /^[A-Z]{2}$/i;

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validate phone number format
 */
export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone.trim());
}

/**
 * Validate ZIP code format
 */
export function isValidZip(zip: string): boolean {
  return ZIP_REGEX.test(zip.trim());
}

/**
 * Validate state abbreviation
 */
export function isValidState(state: string): boolean {
  return STATE_REGEX.test(state.trim());
}

/**
 * Validate required string field
 */
export function isNotEmpty(value: string | undefined | null): boolean {
  return value !== undefined && value !== null && value.trim().length > 0;
}

/**
 * Validate string length
 */
export function isValidLength(
  value: string,
  minLength: number,
  maxLength: number
): boolean {
  const trimmed = value.trim();
  return trimmed.length >= minLength && trimmed.length <= maxLength;
}

/**
 * Validate positive number
 */
export function isPositiveNumber(value: number | string): boolean {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && num >= 0;
}

/**
 * Validate client form input - ALL FIELDS REQUIRED
 */
export function validateClientInput(input: Partial<CreateClientInput>): ValidationErrors {
  const errors: ValidationErrors = {};

  // First name validation (required)
  if (!isNotEmpty(input.first_name)) {
    errors.first_name = 'First name is required';
  } else if (!isValidLength(input.first_name!, 1, 50)) {
    errors.first_name = 'First name must be 1-50 characters';
  }

  // Last name validation (required)
  if (!isNotEmpty(input.last_name)) {
    errors.last_name = 'Last name is required';
  } else if (!isValidLength(input.last_name!, 1, 50)) {
    errors.last_name = 'Last name must be 1-50 characters';
  }

  // Phone validation (required)
  if (!isNotEmpty(input.phone)) {
    errors.phone = 'Phone number is required';
  } else if (!isValidPhone(input.phone!)) {
    errors.phone = 'Please enter a valid phone number';
  }

  // Email validation (required)
  if (!isNotEmpty(input.email)) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(input.email!)) {
    errors.email = 'Please enter a valid email address';
  }

  // Street validation (required)
  if (!isNotEmpty(input.street)) {
    errors.street = 'Street address is required';
  } else if (!isValidLength(input.street!, 1, 100)) {
    errors.street = 'Street must be 1-100 characters';
  }

  // City validation (required)
  if (!isNotEmpty(input.city)) {
    errors.city = 'City is required';
  } else if (!isValidLength(input.city!, 1, 50)) {
    errors.city = 'City must be 1-50 characters';
  }

  // State validation (required, 2-letter abbreviation)
  if (!isNotEmpty(input.state)) {
    errors.state = 'State is required';
  } else if (!isValidState(input.state!)) {
    errors.state = 'Enter 2-letter state code (e.g., NY)';
  }

  // ZIP code validation (required)
  if (!isNotEmpty(input.zip_code)) {
    errors.zip_code = 'ZIP code is required';
  } else if (!isValidZip(input.zip_code!)) {
    errors.zip_code = 'Enter valid ZIP (e.g., 12345)';
  }

  // Hourly rate validation (required)
  if (input.hourly_rate === undefined || input.hourly_rate === null) {
    errors.hourly_rate = 'Hourly rate is required';
  } else if (!isPositiveNumber(input.hourly_rate)) {
    errors.hourly_rate = 'Hourly rate must be a positive number';
  }

  return errors;
}

/**
 * Check if there are any validation errors
 */
export function hasErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Sanitize string input (trim whitespace)
 */
export function sanitizeString(value: string | undefined | null): string {
  return (value ?? '').trim();
}

/**
 * Parse currency input to number
 */
export function parseCurrency(value: string): number {
  // Remove currency symbols and commas
  const cleaned = value.replace(/[$,]/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
