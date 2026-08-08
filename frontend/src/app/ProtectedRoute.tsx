import { useEffect } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthReady, isAuthenticated } = useAuth();

  useEffect(() => {
    // TEMP DEBUG — remove once the "Auth session missing" investigation is closed.
    // Compares what AuthContext believes vs what Supabase's own client reports
    // at the exact moment ProtectedRoute makes its redirect decision.
    supabase.auth.getSession().then(({ data, error }) => {
      console.log("[ProtectedRoute] getSession() at route decision", {
        isAuthReady,
        isAuthenticated,
        hasSession: Boolean(data.session),
        userId: data.session?.user?.id ?? null,
        error: error?.message ?? null,
      });
    });
  }, [isAuthReady, isAuthenticated]);

  if (!isAuthReady) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
