import { zodResolver } from "@hookform/resolvers/zod";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { useReducedMotion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "../components/ui/button";
import { GhostIllustration } from "../components/shared/GhostIllustration";
import { GoogleIcon } from "../components/shared/GoogleIcon";
import { Input } from "../components/ui/input";
import { HERO_BG, MUTED, NAVY, PAGE_BG } from "../components/landing/theme";
import { useAuth } from "../contexts/AuthContext";
import { hasSupabaseConfig, supabase } from "../lib/supabase";
import { register as registerAccount } from "../services/auth";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

const registerSchema = z
  .object({
    first_name: z.string().min(2),
    last_name: z.string().min(2),
    username: z.string().min(3),
    email: z.email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

const REMEMBERED_EMAIL_KEY = "inventra_remembered_email";

function getRememberedEmail(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? "";
}

const fieldLabelClass = "mb-1.5 block text-xs font-semibold text-slate-600";
const fieldInputBase =
  "h-11 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-150 focus:border-[#1677FF] focus:ring-4 focus:ring-[#1677FF]/12";

function fieldInputClass(hasError?: boolean) {
  return hasError ? `${fieldInputBase} !border-rose-400 focus:!ring-rose-400/15` : fieldInputBase;
}

const primaryButtonClass =
  "group relative flex h-11 w-full items-center justify-center overflow-hidden rounded-xl bg-[#1677FF] text-sm font-semibold text-white shadow-[0_14px_28px_-10px_rgba(22,119,255,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0F62E0] hover:shadow-[0_18px_34px_-8px_rgba(22,119,255,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1677FF]/40 focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-55 disabled:shadow-none disabled:hover:translate-y-0";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">(searchParams.get("mode") === "register" ? "register" : "login");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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
    getValues: getLoginValues,
    formState: { isSubmitting: isLoggingIn, errors: loginErrors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: getRememberedEmail() } });

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

      if (rememberMe) {
        window.localStorage.setItem(REMEMBERED_EMAIL_KEY, values.email);
      } else {
        window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      navigate("/home");
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
      navigate("/home");
    } catch (error: any) {
      console.error("Signup submit failed", error);
      toast.error(getErrorMessage(error, "Could not create account."));
    }
  };

  const handleForgotPassword = async () => {
    if (!hasSupabaseConfig) {
      toast.error("Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.");
      return;
    }

    const email = getLoginValues("email");
    if (!email) {
      toast.error("Enter your email above, then tap Forgot Password.");
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      toast.success("Password reset email sent. Check your inbox.");
    } catch (error) {
      console.error("Forgot password failed", error);
      toast.error(getErrorMessage(error, "Could not send reset email. Try again."));
    }
  };

  const handleGoogleLogin = async () => {
    if (!hasSupabaseConfig) {
      toast.error("Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.");
      return;
    }

    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/home` },
      });
      if (error) throw error;
      // On success Supabase redirects the browser away from this page, so
      // isGoogleLoading intentionally stays true until that navigation happens.
    } catch (error) {
      console.error("Google login failed", error);
      toast.error(getErrorMessage(error, "Could not start Google sign-in."));
      setIsGoogleLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center overflow-x-hidden p-0 sm:p-6"
      style={{ background: `radial-gradient(120% 90% at 50% 0%, ${HERO_BG} 0%, ${PAGE_BG} 65%)` }}
    >
      {/* Subtle atmospheric glow, matching the landing page's brand language */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{
          background:
            "radial-gradient(45% 35% at 12% 8%, rgba(78,187,255,0.28) 0%, transparent 70%)," +
            "radial-gradient(40% 30% at 92% 100%, rgba(22,119,255,0.2) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative min-h-screen w-full overflow-hidden bg-white shadow-[0_40px_100px_-30px_rgba(22,119,255,0.32)] ring-1 ring-[rgba(22,119,255,0.14)] sm:min-h-0 sm:max-w-5xl sm:rounded-[2rem] lg:max-w-6xl">
        <div className="grid md:grid-cols-2">
          {/* Left: welcome message + illustration — stacked on mobile instead of
              hidden, so the illustration is visible at every breakpoint. The
              blob shapes, dots, and speech bubbles are baked into
              skeleton-hero.png itself and are left completely untouched. */}
          <div className="relative flex flex-col justify-center overflow-hidden p-8 lg:p-10" style={{ backgroundColor: HERO_BG }}>
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(55% 45% at 20% 15%, rgba(78,187,255,0.3) 0%, transparent 70%)," +
                  "radial-gradient(45% 35% at 85% 90%, rgba(22,119,255,0.2) 0%, transparent 70%)",
              }}
              aria-hidden="true"
            />

            <div className="relative z-10 text-center">
              <h2 className="font-serif text-2xl leading-tight lg:text-[28px]" style={{ color: NAVY }}>
                Welcome to INVENTRA
              </h2>
            </div>

            <div className="relative z-10 mx-auto mt-6 w-full max-w-[360px]">
              <GhostIllustration disableMotion={!!prefersReducedMotion} />
            </div>

            <div className="relative z-10 mt-6 text-center">
              <p className="text-sm sm:text-base" style={{ color: MUTED }}>
                Every parcel, tracked. Every stock, under control.
              </p>
            </div>
          </div>

          {/* Right: auth form */}
          <div className="flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-12 lg:px-14">
            <div className="mx-auto w-full max-w-sm">
              <div className="mb-8 flex items-center gap-2.5">
                <img src="/logo.png" alt="Inventra logo" className="h-9 w-9 rounded-lg object-contain" />
                <span className="text-sm font-black tracking-[0.28em]" style={{ color: NAVY }}>
                  INVENTRA
                </span>
              </div>

              <h1 className="text-2xl font-black tracking-tight sm:text-[26px]" style={{ color: NAVY }}>
                {mode === "login" ? "Login to your Account" : "Create your Account"}
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                {mode === "login"
                  ? "See what's going on with your inventory and shipments."
                  : "Set up your INVENTRA account to start tracking stock."}
              </p>

              {!hasSupabaseConfig && (
                <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                  Supabase env vars are missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env to enable login and data
                  loading.
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading || !hasSupabaseConfig}
                className="mt-6 flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1677FF]/25 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-55"
              >
                <GoogleIcon className="h-4 w-4" />
                {isGoogleLoading ? "Redirecting…" : "Continue with Google"}
              </button>

              <div className="my-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {mode === "login" ? "or Sign in with Email" : "or Sign up with Email"}
                </span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              {mode === "login" && (
                <form className="space-y-4" onSubmit={handleLoginSubmit(onLogin)} noValidate>
                  <div>
                    <label className={fieldLabelClass} htmlFor="login-email">
                      Email
                    </label>
                    <Input
                      id="login-email"
                      className={fieldInputClass(!!loginErrors.email)}
                      placeholder="mail@abc.com"
                      type="email"
                      autoComplete="email"
                      aria-invalid={!!loginErrors.email}
                      aria-describedby={loginErrors.email ? "login-email-error" : undefined}
                      {...registerLogin("email")}
                    />
                    {loginErrors.email && (
                      <p id="login-email-error" className="mt-1 text-xs text-rose-600">
                        {loginErrors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={fieldLabelClass} htmlFor="login-password">
                      Password
                    </label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        className={`${fieldInputClass(!!loginErrors.password)} pr-10`}
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        aria-invalid={!!loginErrors.password}
                        aria-describedby={loginErrors.password ? "login-password-error" : undefined}
                        {...registerLogin("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((value) => !value)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                        aria-label={showLoginPassword ? "Hide password" : "Show password"}
                        tabIndex={-1}
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {loginErrors.password && (
                      <p id="login-password-error" className="mt-1 text-xs text-rose-600">
                        {loginErrors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <label className="flex cursor-pointer select-none items-center gap-2 text-slate-600">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(event) => setRememberMe(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 accent-[#1677FF]"
                      />
                      Remember Me
                    </label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="font-semibold text-[#1677FF] transition hover:text-[#0F62E0] hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <Button type="submit" className={primaryButtonClass} disabled={isLoggingIn || !hasSupabaseConfig}>
                    {isLoggingIn ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Signing in…
                      </>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </form>
              )}

              {mode === "register" && (
                <form className="space-y-4" onSubmit={handleRegisterSubmit(onRegister)} noValidate>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={fieldLabelClass} htmlFor="register-first-name">
                        First Name
                      </label>
                      <Input
                        id="register-first-name"
                        className={fieldInputClass(!!registerErrors.first_name)}
                        placeholder="First name"
                        autoComplete="given-name"
                        {...registerCreate("first_name")}
                      />
                      {registerErrors.first_name && <p className="mt-1 text-xs text-rose-600">{registerErrors.first_name.message}</p>}
                    </div>
                    <div>
                      <label className={fieldLabelClass} htmlFor="register-last-name">
                        Last Name
                      </label>
                      <Input
                        id="register-last-name"
                        className={fieldInputClass(!!registerErrors.last_name)}
                        placeholder="Last name"
                        autoComplete="family-name"
                        {...registerCreate("last_name")}
                      />
                      {registerErrors.last_name && <p className="mt-1 text-xs text-rose-600">{registerErrors.last_name.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className={fieldLabelClass} htmlFor="register-username">
                      Username
                    </label>
                    <Input
                      id="register-username"
                      className={fieldInputClass(!!registerErrors.username)}
                      placeholder="Username"
                      autoComplete="username"
                      {...registerCreate("username")}
                    />
                    {registerErrors.username && <p className="mt-1 text-xs text-rose-600">{registerErrors.username.message}</p>}
                  </div>

                  <div>
                    <label className={fieldLabelClass} htmlFor="register-email">
                      Email
                    </label>
                    <Input
                      id="register-email"
                      className={fieldInputClass(!!registerErrors.email)}
                      placeholder="mail@abc.com"
                      type="email"
                      autoComplete="email"
                      {...registerCreate("email")}
                    />
                    {registerErrors.email && <p className="mt-1 text-xs text-rose-600">{registerErrors.email.message}</p>}
                  </div>

                  <div>
                    <label className={fieldLabelClass} htmlFor="register-password">
                      Password
                    </label>
                    <div className="relative">
                      <Input
                        id="register-password"
                        className={`${fieldInputClass(!!registerErrors.password)} pr-10`}
                        type={showRegisterPassword ? "text" : "password"}
                        placeholder="Create a password"
                        autoComplete="new-password"
                        {...registerCreate("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword((value) => !value)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                        aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                        tabIndex={-1}
                      >
                        {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {registerErrors.password && <p className="mt-1 text-xs text-rose-600">{registerErrors.password.message}</p>}
                  </div>

                  <div>
                    <label className={fieldLabelClass} htmlFor="register-confirm-password">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Input
                        id="register-confirm-password"
                        className={`${fieldInputClass(!!registerErrors.confirmPassword)} pr-10`}
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        autoComplete="new-password"
                        {...registerCreate("confirmPassword")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((value) => !value)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {registerErrors.confirmPassword && (
                      <p className="mt-1 text-xs text-rose-600">{registerErrors.confirmPassword.message}</p>
                    )}
                  </div>

                  <Button type="submit" className={primaryButtonClass} disabled={isRegistering || !hasSupabaseConfig}>
                    {isRegistering ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Creating account…
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              )}

              <p className="mt-6 text-center text-sm text-slate-500">
                {mode === "login" ? (
                  <>
                    Not Registered Yet?{" "}
                    <button type="button" onClick={() => setMode("register")} className="font-semibold text-[#1677FF] hover:underline">
                      Create an account
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button type="button" onClick={() => setMode("login")} className="font-semibold text-[#1677FF] hover:underline">
                      Login
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
