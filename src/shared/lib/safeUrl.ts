/**
 * src/shared/lib/safeUrl.ts
 * Strict URL validator and sanitizer for broadcast notifications, action links, and redirects.
 * Defends against XSS, javascript: pseudoprotocols, and malicious scheme injection.
 */

const DANGEROUS_PROTOCOLS = [
  'javascript:',
  'vbscript:',
  'data:',
  'blob:',
  'file:'
];

export function isSafeUrl(rawUrl: string | undefined | null): boolean {
  if (!rawUrl) return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;

  // Reject protocol-relative and backslash evasions (e.g., //evil.com, /\\evil.com, /\evil.com)
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\') || trimmed.startsWith('\\') || /^\/[/\\]/.test(trimmed)) {
    return false;
  }

  // Strip all internal whitespace and control characters to detect obfuscated schemes like "java\nscript:"
  const noWhitespace = trimmed.replace(/[\x00-\x20\s\r\n\t]/g, '').toLowerCase();
  for (const dangerous of DANGEROUS_PROTOCOLS) {
    if (noWhitespace.startsWith(dangerous) || noWhitespace.includes(dangerous)) {
      return false;
    }
  }

  // Internal absolute paths starting with a single '/'
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) {
    return true;
  }

  // Anchor links
  if (trimmed.startsWith('#')) {
    return true;
  }

  // Validate full URL using URL parser
  try {
    const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost:3000';
    const parsed = new URL(trimmed, origin);
    // Only allow http: or https:
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      // Extra check on host for protocol-relative bypasses
      if (!parsed.hostname && !trimmed.startsWith('/')) {
        return false;
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export const isValidSafeUrl = isSafeUrl;

export function sanitizeUrl(rawUrl: string | undefined | null, fallback: string = '/'): string {
  if (isSafeUrl(rawUrl)) {
    return rawUrl!.trim();
  }
  return fallback;
}

export function sanitizeSafeUrl(rawUrl: string | undefined | null): string | null {
  if (isSafeUrl(rawUrl)) {
    return rawUrl!.trim();
  }
  return null;
}
