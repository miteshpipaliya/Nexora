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

  // Internal absolute paths starting with '/' are safe (e.g. /competitions, /about)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return true;
  }

  // Anchor links
  if (trimmed.startsWith('#')) {
    return true;
  }

  // Check lowercase protocol
  const lower = trimmed.toLowerCase();
  for (const dangerous of DANGEROUS_PROTOCOLS) {
    if (lower.startsWith(dangerous) || lower.includes(` ${dangerous}`)) {
      return false;
    }
  }

  // Validate full URL
  try {
    const parsed = new URL(trimmed, window.location.origin);
    // Only allow http: or https:
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function sanitizeUrl(rawUrl: string | undefined | null, fallback: string = '/'): string {
  if (isSafeUrl(rawUrl)) {
    return rawUrl!.trim();
  }
  return fallback;
}
