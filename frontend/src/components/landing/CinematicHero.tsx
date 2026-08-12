import { animate, motion, useAnimationControls, useInView, useMotionValue, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Rocket } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

import { BLUE, BORDER, CARD_BG, CYAN, EASE_OUT, MUTED, NAVY } from "./theme";

/**
 * Full-viewport hero — no floating card, no page-background gutter around
 * it, so the first screen the visitor sees is the hero itself edge to edge.
 * A rounded panel with an atmospheric blue/cyan orb and a dashboard preview
 * rise into place once on mount (no scroll-jacking — a previous pinned
 * version was heavier and contributed to a visible load delay). A very
 * subtle scroll-linked parallax and an idle float continue afterward, both
 * paused when the hero is off-screen or the tab isn't visible. Fully static
 * when the user prefers reduced motion.
 */
export function CinematicHero({ prefersReducedMotion }: { prefersReducedMotion?: boolean }) {
  const systemReducedMotion = useReducedMotion();
  const reduced = prefersReducedMotion ?? !!systemReducedMotion;

  const heroRef = useRef<HTMLElement>(null);
  const isInView = useInView(heroRef, { amount: 0.15 });
  const floatControls = useAnimationControls();

  // Subtle scroll-linked parallax — orb drifts a little more than the dashboard.
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const orbParallax = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -48]);
  const dashboardParallax = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -18]);

  // A single shared 0→1 progress value drives the rocket launch and every
  // piece of hero content it pulls upward with it — one timeline, three
  // speeds (rocket fastest, copy slower, background glow slowest), no
  // per-element delays. Reduced-motion users get the settled end state
  // immediately, with the rocket itself never becoming visible.
  const launch = useMotionValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) {
      launch.set(1);
      return;
    }
    launch.set(0);
    const controls = animate(launch, 1, { duration: 2.4, delay: 0.15, ease: EASE_OUT });
    return () => controls.stop();
  }, [reduced, launch]);

  const rocketY = useTransform(launch, [0, 1], [420, -560]);
  const rocketOpacity = useTransform(launch, [0, 0.1, 0.75, 1], [0, 1, 1, 0]);

  const contentY = useTransform(launch, [0, 1], [44, 0]);
  const contentOpacity = useTransform(launch, [0, 0.4], [0, 1]);

  const glowLaunchY = useTransform(launch, [0, 1], [18, 0]);
  const glowOpacity = useTransform(launch, [0, 0.5], [0, 0.55]);
  const orbY = useTransform([glowLaunchY, orbParallax], ([a, b]) => (a as number) + (b as number));

  const dashboardLaunchY = useTransform(launch, [0, 1], [130, 0]);
  const dashboardOpacity = useTransform(launch, [0, 0.45], [0, 1]);
  const dashboardY = useTransform([dashboardLaunchY, dashboardParallax], ([a, b]) => (a as number) + (b as number));

  // Gentle idle float on the settled dashboard, only while the hero is
  // actually visible and the tab is active — otherwise it's wasted work.
  useEffect(() => {
    if (reduced) return;

    const tabVisible = () => document.visibilityState === "visible";

    if (isInView && tabVisible()) {
      floatControls.start({
        y: [0, -6, 0],
        transition: { duration: 6, repeat: Infinity, ease: "easeInOut" },
      });
    } else {
      floatControls.stop();
    }

    const onVisibility = () => {
      if (isInView && tabVisible()) {
        floatControls.start({ y: [0, -6, 0], transition: { duration: 6, repeat: Infinity, ease: "easeInOut" } });
      } else {
        floatControls.stop();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [isInView, reduced, floatControls]);

  return (
    <motion.section
      id="hero"
      ref={heroRef}
      initial={reduced ? {} : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: EASE_OUT }}
      className="relative flex min-h-screen w-full flex-col overflow-hidden"
      style={{ backgroundColor: "#DCEEFF" }}
    >
      {/* Atmospheric gradients */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 40% at 20% 6%, rgba(78,187,255,0.35) 0%, transparent 70%)," +
            "radial-gradient(45% 35% at 84% 0%, rgba(22,119,255,0.22) 0%, transparent 70%)," +
            "radial-gradient(70% 50% at 50% 100%, rgba(78,187,255,0.18) 0%, transparent 75%)",
        }}
        aria-hidden="true"
      />

      {/* Rising orb — slowest layer of the shared launch progress */}
      <motion.div
        className="pointer-events-none absolute bottom-[-38%] left-1/2 h-[1100px] w-[1100px] -translate-x-1/2 rounded-full"
        style={{
          background: `radial-gradient(circle, ${CYAN} 0%, ${BLUE} 38%, rgba(22,119,255,0) 72%)`,
          opacity: glowOpacity,
          y: orbY,
          z: 0,
        }}
        aria-hidden="true"
      />

      {/* Rocket — fastest layer of the shared launch progress. Pulls the
          hero content up with it, then fades out near the top, handing
          off to the settled hero state. */}
      <motion.div
        className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2"
        style={{ bottom: "6%", y: rocketY, opacity: rocketOpacity, z: 0 }}
        aria-hidden="true"
      >
        <div className="relative flex items-center justify-center">
          <div
            className="absolute inset-0 -z-10 rounded-full blur-2xl"
            style={{
              background: `radial-gradient(circle, ${CYAN} 0%, ${BLUE} 55%, rgba(22,119,255,0) 75%)`,
              opacity: 0.7,
              transform: "scale(3.4)",
            }}
          />
          <Rocket
            className="h-14 w-14 -rotate-45 drop-shadow-[0_8px_20px_rgba(22,119,255,0.45)] sm:h-20 sm:w-20"
            style={{ color: BLUE }}
            strokeWidth={1.6}
          />
        </div>
      </motion.div>

      {/* Soft grain — desktop only, static, no blend mode (kept cheap on purpose) */}
      <div
        className="pointer-events-none absolute inset-0 hidden opacity-[0.035] sm:block"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
        aria-hidden="true"
      />

      {/* Hero copy — one motion value (contentY/contentOpacity), pulled
          upward by the same launch progress as the rocket, just slower.
          pt-28 clears the fixed nav bar above it. */}
      <motion.div
        style={{ y: contentY, opacity: contentOpacity, z: 0 }}
        className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 pt-28 pb-6 text-center sm:pt-32"
      >
        <div
          className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide"
          style={{ backgroundColor: "rgba(255,255,255,0.6)", borderColor: BORDER, color: BLUE }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: CYAN }} />
          Inventory and parcel intelligence
        </div>

        <h1
          className="mx-auto max-w-3xl font-serif text-[clamp(2.1rem,5.4vw,4.25rem)] leading-[1.05]"
          style={{ color: NAVY }}
        >
          Master your inventory.
          <br />
          Command what&apos;s next.
        </h1>

        <p className="mx-auto mt-5 max-w-md text-[clamp(0.95rem,1.7vw,1.1rem)]" style={{ color: MUTED }}>
          The inventory and parcel-tracking system built for T-shirt and apparel businesses.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/login?mode=register"
            className="group flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_-12px_rgba(22,119,255,0.55)] transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1677FF]/50 sm:w-auto"
            style={{ backgroundColor: BLUE }}
          >
            Get Started
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#product"
            className="w-full rounded-xl border px-6 py-3 text-center text-sm font-semibold transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1677FF]/50 sm:w-auto"
            style={{ backgroundColor: "rgba(255,255,255,0.6)", borderColor: BORDER, color: NAVY }}
          >
            Explore Features
          </a>
        </div>
      </motion.div>

      {/* Dashboard preview — same shared launch progress, largest of the
          two content-tier offsets so it still reads as "pulled" by the rocket. */}
      <motion.div
        id="dashboard"
        style={{ y: dashboardY, opacity: dashboardOpacity, z: 0 }}
        className="relative z-10 mx-auto w-[94%] max-w-3xl px-1 pb-10 sm:w-[82%] sm:pb-14 md:w-[62%] lg:pb-16"
      >
        <motion.div animate={floatControls}>
          <DashboardPreview />
        </motion.div>
      </motion.div>
    </motion.section>
  );
}

const STAT_TILES = [
  { label: "Total Stock", value: "12,480", tone: BLUE },
  { label: "Low-Stock Alerts", value: "36", tone: "#d97706" },
  { label: "Pending Orders", value: "18", tone: CYAN },
  { label: "Active Parcels", value: "9", tone: "#059669" },
];

const SIZE_BREAKDOWN = [
  { size: "S", pct: 38 },
  { size: "M", pct: 72 },
  { size: "L", pct: 90 },
  { size: "XL", pct: 54 },
  { size: "XXL", pct: 22 },
];

export function DashboardPreview() {
  return (
    <div
      className="overflow-hidden rounded-2xl border shadow-[0_24px_60px_-24px_rgba(22,119,255,0.35)]"
      style={{ backgroundColor: CARD_BG, borderColor: BORDER }}
    >
      <div className="flex items-center gap-3 border-b px-4 py-2.5" style={{ borderColor: BORDER, backgroundColor: "rgba(255,255,255,0.5)" }}>
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#ff5f56]" />
          <span className="h-2 w-2 rounded-full bg-[#ffbd2e]" />
          <span className="h-2 w-2 rounded-full bg-[#27c93f]" />
        </div>
        <div
          className="mx-auto flex w-full max-w-[220px] items-center justify-center rounded-md px-3 py-1 text-[10px]"
          style={{ backgroundColor: "rgba(22,119,255,0.08)", color: MUTED }}
        >
          app.inventra.io/dashboard
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
          Stock Health Overview
        </p>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STAT_TILES.map((tile) => (
            <div key={tile.label} className="rounded-lg border p-2.5" style={{ borderColor: BORDER, backgroundColor: "rgba(255,255,255,0.6)" }}>
              <p className="text-[9px] sm:text-[10px]" style={{ color: MUTED }}>
                {tile.label}
              </p>
              <p className="mt-1 text-base font-bold sm:text-lg" style={{ color: tile.tone }}>
                {tile.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_1.2fr]">
          <div className="rounded-lg border p-3" style={{ borderColor: BORDER, backgroundColor: "rgba(255,255,255,0.6)" }}>
            <p className="mb-2 text-[9px] font-semibold uppercase tracking-wide sm:text-[10px]" style={{ color: MUTED }}>
              Inventory by size
            </p>
            <div className="flex flex-col gap-1.5">
              {SIZE_BREAKDOWN.map((row) => (
                <div key={row.size} className="flex items-center gap-2">
                  <span className="w-6 text-[9px] font-medium sm:text-[10px]" style={{ color: NAVY }}>
                    {row.size}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: "rgba(22,119,255,0.1)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${row.pct}%`, background: `linear-gradient(90deg, ${BLUE}, ${CYAN})` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border p-3" style={{ borderColor: BORDER, backgroundColor: "rgba(255,255,255,0.6)" }}>
            <p className="mb-2 text-[9px] font-semibold uppercase tracking-wide sm:text-[10px]" style={{ color: MUTED }}>
              Stock trend — 7 days
            </p>
            <div className="flex h-12 items-end gap-1 sm:h-16 sm:gap-1.5">
              {[38, 52, 44, 68, 58, 74, 46].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm"
                  style={{ height: `${h}%`, background: `linear-gradient(0deg, ${BLUE} 0%, ${CYAN} 100%)` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
