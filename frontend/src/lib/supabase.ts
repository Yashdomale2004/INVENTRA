import { createClient, type User } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

const fallbackUrl = "https://placeholder.supabase.co";
const fallbackAnonKey = "placeholder-anon-key";

export const supabase = createClient(supabaseUrl ?? fallbackUrl, supabaseAnonKey ?? fallbackAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

if (!hasSupabaseConfig) {
  console.warn("INVENTRA is running without Supabase env vars. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env to enable auth and data access.");
}

/**
 * Reads the current user from the locally persisted session.
 *
 * Deliberately uses `getSession()` instead of `supabase.auth.getUser()`. `getUser()`
 * re-validates the JWT against Supabase over the network and throws
 * `AuthSessionMissingError` ("Auth session missing!") if it can't find a session at
 * the instant it's called — including right after `signInWithPassword()` resolves,
 * where the session is already persisted but this call can still race and throw.
 * `getSession()` reads the session already held by the client (memory, falling back
 * to storage) with no network round-trip and never throws for a missing session —
 * it just returns `null`, which callers here turn into a clear "not authenticated"
 * error instead of a cryptic SDK message.
 */
export async function getCurrentUser(): Promise<User> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;
  if (!session?.user) throw new Error("User not authenticated. Please log in again.");

  return session.user;
}

export async function getCurrentUserId(): Promise<string> {
  const user = await getCurrentUser();
  return user.id;
}
