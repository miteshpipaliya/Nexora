/**
 * src/shared/lib/phoneUtils.ts
 * Standardized utility for Indian Mobile Number (+91) validation, formatting, and normalization.
 *
 * Rules:
 * - National number: exactly 10 digits, starts with 6, 7, 8, or 9
 * - Canonical storage format: E.164 standard (+91XXXXXXXXXX)
 * - Display format: +91 98765 43210
 * - Safe legacy data compatibility (does not destroy existing records)
 */

export const INDIA_COUNTRY_CODE = '+91';
export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
export const CANONICAL_E164_INDIAN_REGEX = /^\+91[6-9]\d{9}$/;

/**
 * Strips all non-digit characters from an input string.
 */
export function cleanDigits(input: string | undefined | null): string {
  if (!input) return '';
  return String(input).replace(/\D/g, '');
}

/**
 * Extracts the 10-digit Indian national mobile number from various inputs
 * (e.g. "+919876543210", "919876543210", "09876543210", "98765-43210").
 */
export function extractIndianNationalNumber(input: string | undefined | null): string {
  if (!input) return '';
  const digits = cleanDigits(input);

  // If starts with country code 91 and has 12 digits -> take last 10
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }

  // If starts with trunk prefix 0 and has 11 digits -> take last 10
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }

  // If more than 10 digits (e.g. accidental +91+91 prefix), extract the last 10 digits
  if (digits.length > 10) {
    return digits.slice(-10);
  }

  // Up to 10 digits
  return digits.slice(0, 10);
}

/**
 * Validates whether a 10-digit number is a valid Indian mobile number.
 */
export function validateIndianMobile(input: string | undefined | null): { valid: boolean; error?: string } {
  if (!input || !input.trim()) {
    return { valid: false, error: 'Mobile number is required.' };
  }

  const national = extractIndianNationalNumber(input);

  if (national.length === 0) {
    return { valid: false, error: 'Mobile number cannot be empty.' };
  }

  if (national.length < 10) {
    return { valid: false, error: `Mobile number must be 10 digits (${national.length}/10 entered).` };
  }

  if (!/^[6-9]/.test(national)) {
    return { valid: false, error: 'Indian mobile numbers must start with 6, 7, 8, or 9.' };
  }

  if (!INDIAN_MOBILE_REGEX.test(national)) {
    return { valid: false, error: 'Enter a valid 10-digit Indian mobile number.' };
  }

  return { valid: true };
}

/**
 * Normalizes input to canonical E.164 format (+919876543210).
 * If input is empty, returns empty string.
 * If input is valid Indian mobile, returns canonical +91XXXXXXXXXX.
 * If input is legacy/non-standard and cannot be parsed, safely returns trimmed input.
 */
export function normalizeIndianMobile(input: string | undefined | null): string {
  if (!input || !input.trim()) return '';

  const national = extractIndianNationalNumber(input);
  if (INDIAN_MOBILE_REGEX.test(national)) {
    return `${INDIA_COUNTRY_CODE}${national}`;
  }

  // If already matches canonical +91 format
  const trimmed = input.trim();
  if (CANONICAL_E164_INDIAN_REGEX.test(trimmed)) {
    return trimmed;
  }

  // Preserve legacy value safely
  return trimmed;
}

/**
 * Formats an Indian mobile number for display (e.g. "+91 98765 43210").
 */
export function formatIndianMobileDisplay(input: string | undefined | null): string {
  if (!input || !input.trim()) return '—';

  const national = extractIndianNationalNumber(input);
  if (national.length === 10) {
    return `+91 ${national.slice(0, 5)} ${national.slice(5)}`;
  }

  return input.trim();
}
