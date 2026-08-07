/**
 * Extracts a human-readable message from an unknown thrown value.
 *
 * Supabase/PostgREST error responses are plain objects (`{ code, message, details, hint }`)
 * rather than `Error` instances unless `.throwOnError()` is used, so a bare
 * `error instanceof Error` check silently drops their message and falls back to
 * a generic string. This checks both shapes before giving up.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string" &&
    (error as { message: string }).message
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
}
