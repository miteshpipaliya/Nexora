/**
 * Robust API Client for NEXORA
 * Guarantees safe JSON parsing, checks Content-Type, catches HTML/plain-text server error responses,
 * and prevents JSON SyntaxError exceptions from leaking to the user interface.
 */

export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  [key: string]: any;
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
    // Non-JSON response (e.g. Vercel plain text 500 "A server error has occurred", HTML 404/502)
    const textBody = await response.text().catch(() => '');
    console.warn(`[API Non-JSON Response] ${endpoint} Status: ${response.status}:`, textBody.slice(0, 150));

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('The requested API service was not found on the server.');
      }
      if (response.status >= 500) {
        throw new Error('The server encountered a temporary error. Please try again in a moment.');
      }
      throw new Error(textBody.trim() || `Request failed with status ${response.status}`);
    }
    // If ok but not json
    try {
      responseData = JSON.parse(textBody);
    } catch {
      responseData = { success: true, text: textBody };
    }
  }

  if (!response.ok) {
    let errorMessage = responseData?.error || responseData?.message || `Request failed (${response.status})`;
    if (typeof errorMessage === 'object') {
      errorMessage = (errorMessage as any)?.message || JSON.stringify(errorMessage);
    }
    const err = new Error(String(errorMessage));
    (err as any).code = responseData?.code || 'API_ERROR';
    (err as any).status = response.status;
    throw err;
  }

  return responseData as T;
}
