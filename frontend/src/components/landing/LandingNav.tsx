import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { BLUE, BORDER, EASE_OUT, NAVY } from "./theme";

const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "About", href: "#about" },
  { label: "Support", href: "#support" },
];

/**
 * Fixed top nav shared by every landing-page section (not just the hero) —
 * Product/About/Support/Privacy/Terms are now in-page anchors rather than
 * separate routes, so the nav has to stay reachable while scrolling. The
 * backdrop fades in from fully transparent (blends into the hero) to a
 * soft glass bar once the user scrolls past it, driven by a scroll motion
 * value rather than React state so it never triggers a re-render.
 */
export function LandingNav() {
  const reduced = useReducedMotion();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const { scrollY } = useScroll();
  const barBg = useTransform(scrollY, [0, 90], ["rgba(234,246,255,0)", "rgba(234,246,255,0.82)"]);
  const barBorder = useTransform(scrollY, [0, 90], ["rgba(22,119,255,0)", BORDER]);
  const barShadow = useTransform(
    scrollY,
    [0, 90],
    ["0 0 0 rgba(22,119,255,0)", "0 12px 32px -22px rgba(22,119,255,0.4)"]
  );

  return (
    <motion.header
      initial={reduced ? {} : { opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: reduced ? 0 : 0.12, ease: EASE_OUT }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <motion.div
        className="backdrop-blur-md"
        style={{ backgroundColor: barBg, borderBottom: "1px solid", borderColor: barBorder, boxShadow: barShadow }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Inventra logo" className="h-7 w-7 object-contain" />
            <span className="text-xs font-black tracking-[0.28em]" style={{ color: NAVY }}>
              INVENTRA
            </span>
          </Link>

          <nav
            className="hidden items-center gap-1 rounded-full border px-2 py-1.5 backdrop-blur md:flex"
            style={{ backgroundColor: "rgba(255,255,255,0.55)", borderColor: BORDER }}
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1677FF]/50"
                style={{ color: NAVY }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/login"
              className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1677FF]/50"
              style={{ color: NAVY }}
            >
              Login
            </Link>
            <Link
              to="/login?mode=register"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_28px_-10px_rgba(22,119,255,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-10px_rgba(22,119,255,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1677FF]/50"
              style={{ backgroundColor: BLUE }}
            >
              Get Started
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border md:hidden"
            style={{ backgroundColor: "rgba(255,255,255,0.7)", borderColor: BORDER, color: NAVY }}
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileNavOpen && (
          <div className="mx-3 mb-3 rounded-2xl border p-4 shadow-lg md:hidden" style={{ backgroundColor: "#ffffff", borderColor: BORDER }}>
            <div className="flex flex-col gap-3">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileNavOpen(false)}
                  className="py-1.5 text-sm font-medium"
                  style={{ color: NAVY }}
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-1 flex gap-3 border-t pt-3" style={{ borderColor: BORDER }}>
                <Link
                  to="/login"
                  className="flex-1 rounded-xl border py-2.5 text-center text-sm font-semibold"
                  style={{ borderColor: BORDER, color: NAVY }}
                >
                  Login
                </Link>
                <Link
                  to="/login?mode=register"
                  className="flex-1 rounded-xl py-2.5 text-center text-sm font-semibold text-white"
                  style={{ backgroundColor: BLUE }}
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.header>
  );
}
