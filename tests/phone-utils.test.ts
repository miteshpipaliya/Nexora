import { describe, it, expect } from 'vitest';
import {
  extractIndianNationalNumber,
  validateIndianMobile,
  normalizeIndianMobile,
  formatIndianMobileDisplay,
  cleanDigits
} from '../src/shared/lib/phoneUtils';

describe('Indian Mobile Phone Utilities (src/shared/lib/phoneUtils.ts)', () => {
  describe('cleanDigits', () => {
    it('strips non-digits from string', () => {
      expect(cleanDigits('+91 (987) 654-3210')).toBe('919876543210');
      expect(cleanDigits('')).toBe('');
      expect(cleanDigits(null)).toBe('');
      expect(cleanDigits(undefined)).toBe('');
    });
  });

  describe('extractIndianNationalNumber', () => {
    it('extracts exactly 10 digits from plain 10-digit number', () => {
      expect(extractIndianNationalNumber('9876543210')).toBe('9876543210');
    });

    it('extracts from +91 prefixed number', () => {
      expect(extractIndianNationalNumber('+919876543210')).toBe('9876543210');
      expect(extractIndianNationalNumber('+91 98765 43210')).toBe('9876543210');
      expect(extractIndianNationalNumber('919876543210')).toBe('9876543210');
    });

    it('extracts from trunk 0 prefixed number', () => {
      expect(extractIndianNationalNumber('09876543210')).toBe('9876543210');
    });

    it('handles multiple +91 accidental prefixes gracefully', () => {
      expect(extractIndianNationalNumber('+91+919876543210')).toBe('9876543210');
    });

    it('handles partial numbers', () => {
      expect(extractIndianNationalNumber('98765')).toBe('98765');
    });
  });

  describe('validateIndianMobile', () => {
    it('accepts valid 10-digit mobile numbers starting with 6, 7, 8, 9', () => {
      expect(validateIndianMobile('9876543210').valid).toBe(true);
      expect(validateIndianMobile('8765432109').valid).toBe(true);
      expect(validateIndianMobile('7654321098').valid).toBe(true);
      expect(validateIndianMobile('6543210987').valid).toBe(true);
      expect(validateIndianMobile('+91 98765 43210').valid).toBe(true);
    });

    it('rejects numbers starting with invalid digits (0-5)', () => {
      const res = validateIndianMobile('5876543210');
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/must start with 6, 7, 8, or 9/);
    });

    it('rejects numbers with fewer than 10 digits', () => {
      const res = validateIndianMobile('98765');
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/must be 10 digits/);
    });

    it('rejects empty input', () => {
      expect(validateIndianMobile('').valid).toBe(false);
      expect(validateIndianMobile('   ').valid).toBe(false);
      expect(validateIndianMobile(null).valid).toBe(false);
    });
  });

  describe('normalizeIndianMobile', () => {
    it('converts 10-digit number to E.164 (+91XXXXXXXXXX)', () => {
      expect(normalizeIndianMobile('9876543210')).toBe('+919876543210');
      expect(normalizeIndianMobile('+91 98765 43210')).toBe('+919876543210');
      expect(normalizeIndianMobile('09876543210')).toBe('+919876543210');
    });

    it('returns empty string for empty input', () => {
      expect(normalizeIndianMobile('')).toBe('');
      expect(normalizeIndianMobile(null)).toBe('');
    });

    it('preserves existing canonical E.164 numbers', () => {
      expect(normalizeIndianMobile('+919876543210')).toBe('+919876543210');
    });
  });

  describe('formatIndianMobileDisplay', () => {
    it('formats 10-digit number nicely for human reading', () => {
      expect(formatIndianMobileDisplay('+919876543210')).toBe('+91 98765 43210');
      expect(formatIndianMobileDisplay('9876543210')).toBe('+91 98765 43210');
    });

    it('returns fallback dash for empty', () => {
      expect(formatIndianMobileDisplay('')).toBe('—');
      expect(formatIndianMobileDisplay(null)).toBe('—');
    });
  });
});
