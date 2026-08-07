import { createContext, useContext, useEffect, useMemo, useState } from "react";

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

    supabase.auth
      .getSession()
      .then(({ data }) => {
        const hasSession = Boolean(data.session);
        setIsAuthenticated(hasSession);
        setIsAuthReady(true);
        if (hasSession) {
          loadProfile().catch((error) => {
            console.error("Initial profile bootstrap failed", error);
            setUser(null);
          });
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
        setUser(null);
        setIsAuthReady(true);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session));
      if (session) {
        loadProfile().catch((error) => {
          console.error("Auth state profile refresh failed", error);
          setUser(null);
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    await loginApi(email, password);
    await loadProfile();
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
