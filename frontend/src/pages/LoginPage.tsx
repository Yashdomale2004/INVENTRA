import { zodResolver } from "@hookform/resolvers/zod";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, ShieldCheck, Shirt, Truck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "../components/ui/button";
import { WarehouseSceneLeft, WarehouseSceneRight } from "../components/shared/WarehouseScene";
import { Input } from "../components/ui/input";
import { useAuth } from "../contexts/AuthContext";
import { hasSupabaseConfig, supabase } from "../lib/supabase";
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

const REMEMBERED_EMAIL_KEY = "inventra_remembered_email";

function getRememberedEmail(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? "";
}

const darkInputBase = "!border-white/15 !bg-white/[0.06] !text-white placeholder:!text-white/30 transition-all duration-200";

function inputStateClass(hasError?: boolean) {
  return hasError
    ? "!border-rose-400/50 focus:!border-rose-400 focus:!ring-4 focus:!ring-rose-400/15"
    : "hover:!border-white/25 focus:!border-blue-400 focus:!ring-4 focus:!ring-blue-400/20 focus:!bg-white/[0.08]";
}

function darkInputClass(hasError?: boolean) {
  return `${darkInputBase} ${inputStateClass(hasError)}`;
}
function iconInputClass(hasError?: boolean) {
  return `${darkInputClass(hasError)} pl-10 pr-3`;
}
function passwordInputClass(hasError?: boolean) {
  return `${darkInputClass(hasError)} pl-10 pr-10`;
}
const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-wide text-white/50";
const primaryButtonClass =
  "group relative w-full overflow-hidden bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 text-white shadow-[0_12px_32px_-10px_rgba(37,99,235,0.65)] transition-all duration-300 hover:shadow-[0_16px_40px_-8px_rgba(37,99,235,0.8)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050914] dark:text-white";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

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

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050914] p-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(28,58,110,0.5)_0%,rgba(5,9,20,0.96)_42%,#010306_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blue-500/[0.06] via-transparent to-black/40"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(148,197,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,197,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute left-[8%] top-[12%] h-72 w-72 rounded-full bg-blue-500/[0.18] blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute right-[10%] bottom-[10%] h-80 w-80 rounded-full bg-cyan-400/[0.14] blur-[130px]" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.55)_100%)]"
      />

      <WarehouseSceneLeft className="pointer-events-none absolute left-[1%] top-[4%] hidden h-[88%] w-40 lg:block xl:w-48" />
      <WarehouseSceneRight className="pointer-events-none absolute right-[1%] top-[4%] hidden h-[88%] w-40 lg:block xl:w-48" />

      <motion.div
        aria-hidden="true"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute left-[6%] top-1/4 hidden w-48 rounded-2xl border border-white/[0.08] bg-white/[0.05] p-4 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl lg:block"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
          <Shirt className="h-5 w-5" />
        </div>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-white/40">Live Stock Sync</p>
        <p className="mt-1 text-sm font-semibold text-white/80">Real-time inventory</p>
      </motion.div>

      <motion.div
        aria-hidden="true"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
        className="pointer-events-none absolute right-[6%] top-1/4 hidden w-48 rounded-2xl border border-white/[0.08] bg-white/[0.05] p-4 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl lg:block"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300">
          <Truck className="h-5 w-5" />
        </div>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-white/40">Parcel Tracking</p>
        <p className="mt-1 text-sm font-semibold text-white/80">Global shipments</p>
      </motion.div>

      <motion.div
        aria-hidden="true"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2.4 }}
        className="pointer-events-none absolute right-[8%] bottom-[14%] hidden w-48 rounded-2xl border border-white/[0.08] bg-white/[0.05] p-4 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl xl:block"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-white/40">Secure Access</p>
        <p className="mt-1 text-sm font-semibold text-white/80">Encrypted &amp; backed up</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md">
        <div aria-hidden="true" className="pointer-events-none absolute -inset-3 rounded-[2.25rem] bg-blue-500/[0.16] blur-3xl" />

        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.07] shadow-[0_40px_100px_-24px_rgba(0,0,0,0.85)] ring-1 ring-inset ring-white/[0.04] backdrop-blur-2xl">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.08] to-transparent"
          />
          <div className="relative p-7 sm:p-9">
            <div className="mb-7 flex flex-col items-center gap-3 text-center">
              <div className="relative">
                <div aria-hidden="true" className="absolute inset-0 -z-10 rounded-full bg-blue-400/25 blur-xl" />
                <img src="/logo.png" alt="Inventra logo" className="relative h-14 w-14" />
              </div>
              <span className="text-2xl font-black tracking-[0.3em] text-white">INVENTRA</span>
            </div>

            <div className="mb-6 flex rounded-2xl border border-white/10 bg-white/5 p-1">
              {[
                ["login", "Login"],
                ["register", "Create Account"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value as "login" | "register")}
                  className={`relative flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
                    mode === value ? "text-white" : "text-white/50 hover:text-white/80"
                  }`}
                >
                  {mode === value && (
                    <motion.span
                      layoutId="login-tab-pill"
                      className="absolute inset-0 -z-10 rounded-xl bg-white/10 shadow-sm ring-1 ring-white/10"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    />
                  )}
                  {label}
                </button>
              ))}
            </div>

            <h2 className="text-center text-3xl font-black tracking-tight text-white">
              {mode === "login" ? "Welcome Back" : "Create your account"}
            </h2>
            <p className="mt-2 text-center text-sm text-white/55">
              {mode === "login" && "Sign in to manage your inventory and parcels efficiently."}
              {mode === "register" && "Enter your details to create your INVENTRA account."}
            </p>
            <div className="mx-auto mt-4 h-px w-10 bg-gradient-to-r from-blue-400 to-cyan-300" />

            {!hasSupabaseConfig && (
              <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
                Supabase env vars are missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env to enable login and data loading.
              </div>
            )}

            {mode === "login" && (
              <form className="mt-6 space-y-4" onSubmit={handleLoginSubmit(onLogin)}>
                <div>
                  <label className={labelClass}>Email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <Input className={iconInputClass(!!loginErrors.email)} placeholder="you@company.com" type="email" {...registerLogin("email")} />
                  </div>
                  {loginErrors.email && <p className="mt-1 text-xs text-rose-300">{loginErrors.email.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>Password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <Input
                      className={passwordInputClass(!!loginErrors.password)}
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      {...registerLogin("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white/75"
                      aria-label={showLoginPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {loginErrors.password && <p className="mt-1 text-xs text-rose-300">{loginErrors.password.message}</p>}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex cursor-pointer select-none items-center gap-2 text-white/60">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                      className="h-4 w-4 rounded border-white/25 bg-white/5 accent-blue-500"
                    />
                    Remember Me
                  </label>
                  <button type="button" onClick={handleForgotPassword} className="font-semibold text-blue-300 transition hover:text-blue-200">
                    Forgot Password?
                  </button>
                </div>

                <Button className={primaryButtonClass} disabled={isLoggingIn || !hasSupabaseConfig}>
                  <span className="relative z-10">{isLoggingIn ? "Signing in..." : "Sign In"}</span>
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
                </Button>
              </form>
            )}

            {mode === "register" && (
              <form className="mt-6 space-y-4" onSubmit={handleRegisterSubmit(onRegister)}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>First Name</label>
                    <Input className={darkInputClass(!!registerErrors.first_name)} placeholder="First name" {...registerCreate("first_name")} />
                    {registerErrors.first_name && <p className="mt-1 text-xs text-rose-300">{registerErrors.first_name.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Last Name</label>
                    <Input className={darkInputClass(!!registerErrors.last_name)} placeholder="Last name" {...registerCreate("last_name")} />
                    {registerErrors.last_name && <p className="mt-1 text-xs text-rose-300">{registerErrors.last_name.message}</p>}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Username</label>
                  <Input className={darkInputClass(!!registerErrors.username)} placeholder="Username" {...registerCreate("username")} />
                  {registerErrors.username && <p className="mt-1 text-xs text-rose-300">{registerErrors.username.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <Input className={iconInputClass(!!registerErrors.email)} placeholder="you@company.com" type="email" {...registerCreate("email")} />
                  </div>
                  {registerErrors.email && <p className="mt-1 text-xs text-rose-300">{registerErrors.email.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>Password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <Input
                      className={passwordInputClass(!!registerErrors.password)}
                      type={showRegisterPassword ? "text" : "password"}
                      placeholder="Create a password"
                      {...registerCreate("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white/75"
                      aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {registerErrors.password && <p className="mt-1 text-xs text-rose-300">{registerErrors.password.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>Confirm Password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <Input
                      className={passwordInputClass(!!registerErrors.confirmPassword)}
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      {...registerCreate("confirmPassword")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white/75"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {registerErrors.confirmPassword && <p className="mt-1 text-xs text-rose-300">{registerErrors.confirmPassword.message}</p>}
                </div>
                <Button className={primaryButtonClass} disabled={isRegistering || !hasSupabaseConfig}>
                  <span className="relative z-10">{isRegistering ? "Creating account..." : "Create Account"}</span>
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
                </Button>
              </form>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
