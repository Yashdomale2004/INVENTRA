import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { fetchProfile, login as loginApi } from "../services/auth";
import { hasSupabaseConfig, supabase } from "../lib/supabase";

type User = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  avatar_url: string;
  created_at: string;
  last_login_at: string;
};

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const demoUser: User = {
  id: "demo-user",
  username: "demo",
  first_name: "Demo",
  last_name: "User",
  email: "demo@inventra.local",
  mobile: "",
  avatar_url: "",
  created_at: new Date().toISOString(),
  last_login_at: new Date().toISOString(),
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(hasSupabaseConfig ? null : demoUser);
  const [isAuthenticated, setIsAuthenticated] = useState(!hasSupabaseConfig);
  const [isAuthReady, setIsAuthReady] = useState(!hasSupabaseConfig);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setUser(demoUser);
      setIsAuthenticated(true);
      setIsAuthReady(true);
      return;
    }

    let cancelled = false;

    // Single source of truth for auth state. `onAuthStateChange` fires once
    // immediately on subscribe with the current session (event: INITIAL_SESSION),
    // then again on every sign-in/sign-out/token-refresh — so a separate
    // `getSession()` bootstrap call isn't needed and previously raced against
    // this listener, which could leave `isAuthenticated` and `user` out of sync.
    const applySession = async (session: Session | null, source: string) => {
      // TEMP DEBUG — remove once the "Auth session missing" investigation is closed.
      console.log(`[AuthContext] session from ${source}`, {
        hasSession: Boolean(session),
        userId: session?.user?.id ?? null,
        expiresAt: session?.expires_at ?? null,
      });

      if (!session) {
        if (!cancelled) {
          setUser(null);
          setIsAuthenticated(false);
          setIsAuthReady(true);
        }
        return;
      }

      try {
        const profile = await fetchProfile();
        if (!cancelled) {
          setUser(profile);
          setIsAuthenticated(true);
        }
      } catch (error) {
        // A session object existed but we couldn't actually use it (stale/orphaned
        // session, missing profile row, etc). Do NOT leave isAuthenticated true with
        // a null user — that half-authenticated state is what let ProtectedRoute
        // through without a usable session.
        console.error(`[AuthContext] fetchProfile failed after ${source}`, error);
        if (!cancelled) {
          setUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (!cancelled) setIsAuthReady(true);
      }
    };

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      // TEMP DEBUG — remove once the "Auth session missing" investigation is closed.
      console.log("[AuthContext] onAuthStateChange", { event, hasSession: Boolean(session) });
      applySession(session, `onAuthStateChange:${event}`);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { session } = await loginApi(email, password);
    if (!session) {
      // loginApi already throws when Supabase returns no session, but guard here
      // too so this function never reports success without one.
      throw new Error("Login did not return a session.");
    }

    const profile = await fetchProfile();
    setUser(profile);
    setIsAuthenticated(true);
  };

  const loadProfile = async () => {
    const profile = await fetchProfile();
    setUser(profile);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = useMemo(
    () => ({ user, isAuthenticated, isAuthReady, login, logout, loadProfile }),
    [user, isAuthenticated, isAuthReady]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
