import { isAuthRetryableFetchError } from "@supabase/supabase-js";

/**
 * Retries a Supabase Auth call when it fails due to a transient network error
 * (e.g. the request never reached the server — dropped mobile connection, DNS
 * blip, edge timeout). Supabase's SDK already distinguishes this case for us:
 * it wraps raw fetch failures in `AuthRetryableFetchError` specifically to signal
 * "this is worth retrying," as opposed to `AuthApiError` (wrong password, etc.),
 * which is a real response from the server and must never be retried.
 *
 * Desktop's mostly-stable wired/WiFi connection rarely hits this path, so the
 * bug is effectively invisible there; mobile networks hit it often enough that
 * a single unretried attempt regularly surfaces a raw "Load failed" error.
 */
export async function retryOnNetworkError<T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 500): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isAuthRetryableFetchError(error) || attempt === attempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
    }
  }

  throw lastError;
}
