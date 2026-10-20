/**
 * Robust API Client for NEXORA
 * Guarantees safe JSON parsing, checks Content-Type, catches HTML/plain-text server error responses,
 * normalizes error payloads, and prevents "[object Object]" exceptions from leaking to the UI.
 */

export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string | any;
  message?: string;
  code?: string;
  [key: string]: any;
}

/**
 * Universal safe error message extractor that GUARANTEES a human-readable string.
 * Never returns "[object Object]".
 */
export function extractErrorMessage(err: unknown, fallback = 'An unexpected error occurred. Please try again.'): string {
  if (!err) return fallback;
  if (typeof err === 'string') {
    const trimmed = err.trim();
    if (trimmed && trimmed !== '[object Object]') return trimmed;
    return fallback;
  }

  if (typeof err === 'object') {
    const e = err as any;

    // Check direct message string
    if (typeof e.message === 'string' && e.message.trim() && e.message !== '[object Object]') {
      return e.message.trim();
    }

    // Check direct error field (can be string or nested object)
    if (typeof e.error === 'string' && e.error.trim() && e.error !== '[object Object]') {
      return e.error.trim();
    }
    if (typeof e.error === 'object' && e.error !== null) {
      if (typeof e.error.message === 'string' && e.error.message.trim() && e.error.message !== '[object Object]') {
        return e.error.message.trim();
      }
      if (typeof e.error.code === 'string' && e.error.code.trim()) {
        return `Error (${e.error.code}): please try again.`;
      }
    }

    // Check msg or statusText
    if (typeof e.msg === 'string' && e.msg.trim() && e.msg !== '[object Object]') {
      return e.msg.trim();
    }
    if (typeof e.statusText === 'string' && e.statusText.trim()) {
      return e.statusText.trim();
    }

    // Brevo / API specific codes
    if (e.code === 'BREVO_IP_UNAUTHORIZED') {
      return 'Email delivery service requires IP authorization in Brevo console.';
    }
    if (e.code === 'BREVO_KEY_NOT_FOUND') {
      return 'Email delivery service is currently being configured. Please use Google Sign-In or try again shortly.';
    }
    if (e.code === 'BREVO_SENDER_UNVERIFIED') {
      return 'Email sender is unverified. Please check Brevo sender settings.';
    }
    if (e.code === 'BREVO_QUOTA_EXCEEDED') {
      return 'Email sending limit reached. Please contact NEXORA administrator.';
    }
    if (e.code === 'auth/email-already-in-use') {
      return 'An account with this email address already exists. Please log in.';
    }
    if (e.code === 'auth/network-request-failed') {
      return 'Network connection failed. Please check your internet connection.';
    }

    try {
      const json = JSON.stringify(err);
      if (json && json !== '{}' && json !== '[]') {
        return json.slice(0, 200);
      }
    } catch {
      // ignore
    }
  }

  return fallback;
}

export async function safeApiFetch<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...(options?.headers || {})
      }
    });
  } catch (networkErr: any) {
    console.error(`[API Network Error] ${endpoint}:`, networkErr);
    throw new Error('Unable to connect to the NEXORA server. Please check your internet connection.');
  }

  const contentType = response.headers.get('content-type') || '';
  let responseData: any = null;

  if (contentType.includes('application/json')) {
    try {
      responseData = await response.json();
    } catch (parseErr) {
      console.error(`[API JSON Parse Error] ${endpoint}:`, parseErr);
      throw new Error('Server returned an unreadable response. Please try again.');
    }
  } else {
    // Non-JSON response (e.g. Vercel plain text 500, HTML 404/502)
    const textBody = await response.text().catch(() => '');
    console.warn(`[API Non-JSON Response] ${endpoint} Status: ${response.status}:`, textBody.slice(0, 150));

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('The requested API service was not found on the server.');
      }
      if (response.status >= 500) {
        throw new Error('The server encountered a temporary error. Please try again in a moment.');
      }
      const cleaned = textBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150);
      throw new Error(cleaned || `Request failed with status ${response.status}`);
    }

    try {
      responseData = JSON.parse(textBody);
    } catch {
      responseData = { success: true, text: textBody };
    }
  }

  if (!response.ok) {
    const errorMsg = extractErrorMessage(responseData, `Request failed (${response.status})`);
    const err = new Error(errorMsg);
    (err as any).code = responseData?.code || 'API_ERROR';
    (err as any).status = response.status;
    (err as any).data = responseData;
    throw err;
  }

  return responseData as T;
}
