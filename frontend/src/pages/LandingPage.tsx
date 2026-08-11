import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Boxes, Package, ScanLine, ShieldCheck, Truck } from "lucide-react";
import { Link, Navigate } from "react-router-dom";

import { CinematicHero } from "../components/landing/CinematicHero";
import { useAuth } from "../contexts/AuthContext";

const FEATURES = [
  {
    icon: Boxes,
    title: "Live stock tracking",
    body: "Every size and color variant updates in real time, with automatic low-stock alerts before you run out.",
  },
  {
    icon: Package,
    title: "Order workflow",
    body: "Move enquiries through New → Printing → Packed → Dispatched → Received with a full status history.",
  },
  {
    icon: Truck,
    title: "Parcel tracking",
    body: "Track shipments end to end and match tracking numbers straight back to the order they belong to.",
  },
  {
    icon: ScanLine,
    title: "Built for apparel",
    body: "Sizes, brands, and categories modeled the way a T-shirt and apparel business actually stocks product.",
  },
];

const FOOTER_LINKS = [
  { label: "About", href: "/about" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms", href: "/terms" },
  { label: "Support", href: "/support" },
];

export function LandingPage() {
  const { isAuthReady, isAuthenticated } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  if (isAuthReady && isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  const fadeUp = (delay = 0) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: "-80px" },
          transition: { duration: 0.6, delay, ease: "easeOut" as const },
        };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0c0509] text-slate-100">
      {/* Cinematic scroll-choreographed hero — nav lives inside its framed viewport */}
      <CinematicHero prefersReducedMotion={!!prefersReducedMotion} />

      {/* Feature highlights */}
      <section className="relative z-10 bg-[#0c0509] px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <motion.p {...fadeUp(0)} className="mx-auto max-w-xl text-center text-sm text-slate-400 sm:text-base">
            From the moment stock comes in to the moment a parcel is delivered.
          </motion.p>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                {...fadeUp(0.06 * i)}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-colors hover:bg-white/[0.05]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7A2145]/20 text-[#e8879c]">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-sm font-bold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{feature.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="relative z-10 bg-[#0c0509] px-5 pb-24 sm:px-8">
        <motion.div
          {...fadeUp(0)}
          className="mx-auto flex max-w-4xl flex-col items-center gap-5 rounded-[2rem] border border-white/10 bg-gradient-to-b from-[#7A2145]/15 to-transparent px-6 py-14 text-center"
        >
          <ShieldCheck className="h-8 w-8 text-[#e8879c]" />
          <h2 className="text-2xl font-black text-white sm:text-3xl">Ready to see your stock clearly?</h2>
          <p className="max-w-md text-sm text-slate-400">
            Create an account and start tracking inventory, orders, and parcels in minutes.
          </p>
          <Link
            to="/login"
            className="group mt-2 flex items-center gap-2 rounded-xl bg-[#7A2145] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-12px_rgba(122,33,69,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#6A1C3B]"
          >
            Get Started
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-[#0c0509] px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Inventra logo" className="h-6 w-6 object-contain" />
            <span className="text-xs font-black tracking-[0.28em] text-slate-400">INVENTRA</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <Link key={link.label} to={link.href} className="text-xs text-slate-500 transition-colors hover:text-slate-300">
                {link.label}
              </Link>
            ))}
          </div>
          <p className="text-xs text-slate-600">&copy; {new Date().getFullYear()} INVENTRA. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
