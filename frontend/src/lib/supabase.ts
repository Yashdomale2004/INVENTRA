import { createClient } from "@supabase/supabase-js";

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
