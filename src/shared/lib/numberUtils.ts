/**
 * src/shared/lib/numberUtils.ts
 * Safe finite number parsing utilities (B-03).
 * Corrects bugs where `Number(x) ?? default` yields 0 for empty strings and NaN for invalid inputs.
 */

export function toFiniteNumber(val: any, fallback: number): number {
  if (val === null || val === undefined || val === '') return fallback;
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

export function toPositiveInt(val: any, fallback: number): number {
  const n = toFiniteNumber(val, fallback);
  return n > 0 ? Math.floor(n) : fallback;
}
