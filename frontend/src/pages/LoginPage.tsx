import { zodResolver } from "@hookform/resolvers/zod";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useAuth } from "../contexts/AuthContext";
import { hasSupabaseConfig } from "../lib/supabase";
import { register as registerAccount } from "../services/auth";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

const registerSchema = z.object({
  first_name: z.string().min(2),
  last_name: z.string().min(2),
  username: z.string().min(3),
  email: z.email(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");

  const getErrorMessage = (error: any, fallback: string) => {
    if (isAuthRetryableFetchError(error)) {
      return "Network error — the request couldn't reach the server. Check your connection and try again.";
    }

    if (error?.message === "Invalid login credentials") {
      return "Invalid login credentials. Use the account email and password you registered with.";
    }

    if (error?.message === "Email not confirmed") {
      return "This project still requires email confirmation in Supabase Auth settings. Disable Confirm email to allow instant login after signup.";
    }

    if (error?.message === "Auth session missing!") {
      return "Signed in, but the session couldn't be saved. This usually means VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is misconfigured for this deployment (wrong project, stray quotes/whitespace, or the build predates a recent env var change). Verify both in your hosting provider's environment variables and redeploy.";
    }

    if (error?.message) {
      return String(error.message);
    }

    const data = error?.response?.data;
    if (!data) {
      return fallback;
    }

    if (typeof data === "string") {
      return data;
    }

    const firstValue = Object.values(data)[0];
    if (Array.isArray(firstValue)) {
      return String(firstValue[0]);
    }
    if (typeof firstValue === "string") {
      return firstValue;
    }

    return fallback;
  };

  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { isSubmitting: isLoggingIn, errors: loginErrors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const {
    register: registerCreate,
    handleSubmit: handleRegisterSubmit,
    formState: { isSubmitting: isRegistering, errors: registerErrors },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const onLogin = async (values: LoginValues) => {
    if (!hasSupabaseConfig) {
      toast.error("Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.");
      return;
    }

    try {
      await login(values.email, values.password);
      navigate("/dashboard");
    } catch (error) {
      console.error("Login submit failed", error);
      toast.error(getErrorMessage(error, "Login failed. Check your email, password, or account verification status."));
    }
  };

  const onRegister = async (values: RegisterValues) => {
    if (!hasSupabaseConfig) {
      toast.error("Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.");
      return;
    }

    try {
      await registerAccount({
        first_name: values.first_name,
        last_name: values.last_name,
        username: values.username,
        email: values.email,
        password: values.password,
      });
      toast.success("Account created successfully.");
      await login(values.email, values.password);
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Signup submit failed", error);
      toast.error(getErrorMessage(error, "Could not create account."));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_12%_18%,#86efac_0%,#99f6e4_28%,#f0fdfa_56%,#ffffff_82%)] p-4 dark:bg-[radial-gradient(circle_at_10%_20%,#0f172a_0%,#083344_42%,#020617_92%)]">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="overflow-hidden p-0">
          <div className="p-6 sm:p-8">
            <div className="mx-auto max-w-md">
              <div className="mb-6 flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-800/80">
                {[
                  ["login", "Login"],
                  ["register", "Create Account"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMode(value as "login" | "register")}
                    className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      mode === value
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
                        : "text-slate-500"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {mode === "login" && "Secure owner login to manage inventory and parcels."}
                {mode === "register" && "Enter name, surname, user ID, email, and password to create your account in Supabase."}
              </p>

              {!hasSupabaseConfig && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                  Supabase env vars are missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env to enable login and data loading.
                </div>
              )}

              {mode === "login" && (
                <form className="mt-6 space-y-4" onSubmit={handleLoginSubmit(onLogin)}>
                  <div>
                    <Input placeholder="Email" type="email" {...registerLogin("email")} />
                    {loginErrors.email && <p className="mt-1 text-xs text-rose-500">{loginErrors.email.message}</p>}
                  </div>
                  <div>
                    <Input type="password" placeholder="Password" {...registerLogin("password")} />
                    {loginErrors.password && <p className="mt-1 text-xs text-rose-500">{loginErrors.password.message}</p>}
                  </div>
                  <Button className="w-full" disabled={isLoggingIn || !hasSupabaseConfig}>
                    {isLoggingIn ? "Signing in..." : "Login"}
                  </Button>
                </form>
              )}

              {mode === "register" && (
                <form className="mt-6 space-y-4" onSubmit={handleRegisterSubmit(onRegister)}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Input placeholder="First name" {...registerCreate("first_name")} />
                      {registerErrors.first_name && <p className="mt-1 text-xs text-rose-500">{registerErrors.first_name.message}</p>}
                    </div>
                    <div>
                      <Input placeholder="Last name" {...registerCreate("last_name")} />
                      {registerErrors.last_name && <p className="mt-1 text-xs text-rose-500">{registerErrors.last_name.message}</p>}
                    </div>
                  </div>
                  <div>
                    <Input placeholder="Username" {...registerCreate("username")} />
                    {registerErrors.username && <p className="mt-1 text-xs text-rose-500">{registerErrors.username.message}</p>}
                  </div>
                  <div>
                    <Input placeholder="Email" type="email" {...registerCreate("email")} />
                    {registerErrors.email && <p className="mt-1 text-xs text-rose-500">{registerErrors.email.message}</p>}
                  </div>
                  <div>
                    <Input type="password" placeholder="Create password" {...registerCreate("password")} />
                    {registerErrors.password && <p className="mt-1 text-xs text-rose-500">{registerErrors.password.message}</p>}
                  </div>
                  <div>
                    <Input type="password" placeholder="Confirm password" {...registerCreate("confirmPassword")} />
                    {registerErrors.confirmPassword && <p className="mt-1 text-xs text-rose-500">{registerErrors.confirmPassword.message}</p>}
                  </div>
                  <Button className="w-full" disabled={isRegistering || !hasSupabaseConfig}>
                    {isRegistering ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
