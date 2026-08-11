import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Menu, X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

gsap.registerPlugin(ScrollTrigger);

/**
 * INVENTRA's actual brand palette (from LoginPage.tsx and DashboardPage.tsx's
 * own dark-mode status colors) — no coral/orange, everything derives from the
 * app's existing maroon/wine family so the hero reads as the same product.
 */
const INK = "#0c0509"; // page background outside the viewport
const DEEP = "#1a0810"; // viewport base / darkest atmosphere
const MAROON_DEEP = "#6b0f24"; // DashboardPage's own out-of-stock dark maroon
const MAROON = "#5B1730"; // LoginPage headline maroon
const PRIMARY = "#7A2145"; // LoginPage primary brand color
const HOVER = "#6A1C3B"; // LoginPage hover shade
const PINK = "#e8879c"; // DashboardPage's own out-of-stock highlight pink
const BEIGE = "#f3e6d8";

const NAV_LINKS = [
  { label: "Product", href: "#dashboard" },
  { label: "About", href: "/about" },
  { label: "Support", href: "/support" },
];

/**
 * One continuous cinematic scene, pinned for ~300vh of scroll: a mountain
 * landscape with a rising coral beam gives way to a huge coral "sun" that
 * the INVENTRA dashboard rises out of. Structure/timing follow a fixed
 * percentage timeline (see comments); a short non-scroll autoplay intro
 * (landscape + beam) plays on mount, then scroll scrubs the rest. Renders a
 * static final frame when the user prefers reduced motion.
 */
export function CinematicHero({ prefersReducedMotion }: { prefersReducedMotion: boolean }) {
  const pinRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const cloudsRef = useRef<HTMLDivElement>(null);
  const farMtnRef = useRef<HTMLDivElement>(null);
  const backMtnRef = useRef<HTMLDivElement>(null);
  const midMtnRef = useRef<HTMLDivElement>(null);
  const foreMtnRef = useRef<HTMLDivElement>(null);
  const towerRef = useRef<HTMLDivElement>(null);
  const beamGlowRef = useRef<HTMLDivElement>(null);
  const beamCoreRef = useRef<HTMLDivElement>(null);
  const fogRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const darkenRef = useRef<HTMLDivElement>(null);

  const headline1Ref = useRef<HTMLDivElement>(null);
  const pill2Ref = useRef<HTMLDivElement>(null);
  const headline2Ref = useRef<HTMLDivElement>(null);
  const mockupRiseRef = useRef<HTMLDivElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useLayoutEffect(() => {
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      // Ambient, scroll-independent drift — clouds/fog breathing gently.
      // Created paused and only played while the hero is actually on screen (see
      // scrollTrigger callbacks below) so they don't burn CPU/GPU once scrolled past.
      const cloudDrift = gsap.to(cloudsRef.current, {
        x: 18,
        duration: 14,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        paused: true,
      });
      const fogBreathe = gsap.to(fogRef.current, {
        opacity: 0.55,
        duration: 6,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        paused: true,
      });
      cloudDrift.play();
      fogBreathe.play();

      // ---- Master scroll timeline -------------------------------------
      // Positions are fractions (0-1) of the pinned scroll distance, matching:
      //   0.00–0.35  headline 1 reveal
      //   0.35–0.55  parallax + headline 1 exit, atmosphere darkens
      //   0.50–0.70  coral sun rises and expands
      //   0.65–0.82  headline 2 + pill reveal
      //   0.75–0.95  dashboard rises
      //   0.95–1.00  settle / hold
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pinRef.current,
          start: "top top",
          end: "+=300%",
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          onEnter: () => {
            cloudDrift.play();
            fogBreathe.play();
            if (floatRef.current) floatRef.current.style.animationPlayState = "running";
          },
          onLeave: () => {
            cloudDrift.pause();
            fogBreathe.pause();
            if (floatRef.current) floatRef.current.style.animationPlayState = "paused";
          },
          onEnterBack: () => {
            cloudDrift.play();
            fogBreathe.play();
            if (floatRef.current) floatRef.current.style.animationPlayState = "running";
          },
          onLeaveBack: () => {
            cloudDrift.pause();
            fogBreathe.pause();
            if (floatRef.current) floatRef.current.style.animationPlayState = "paused";
          },
        },
      });

      // Headline 1 is revealed by the on-load intro (below), not by scroll — at
      // scroll position 0 it is already fully visible. Scroll only exits it.

      // Parallax / exit (0.35 - 0.55): layers move at different rates, headline 1 fades+blurs+rises out
      tl.to(farMtnRef.current, { y: -10, ease: "none", duration: 0.5 }, 0.35)
        .to(backMtnRef.current, { y: -18, ease: "none", duration: 0.5 }, 0.35)
        .to(midMtnRef.current, { y: -34, ease: "none", duration: 0.5 }, 0.35)
        .to(foreMtnRef.current, { y: -58, ease: "none", duration: 0.5 }, 0.35)
        .to(cloudsRef.current, { y: -10, ease: "none", duration: 0.5 }, 0.35)
        .to(headline1Ref.current, { opacity: 0, y: -34, ease: "power2.inOut", duration: 0.16 }, 0.36)
        .to(
          [farMtnRef.current, backMtnRef.current, midMtnRef.current, foreMtnRef.current, cloudsRef.current, towerRef.current],
          { opacity: 0, ease: "power1.inOut", duration: 0.18 },
          0.42
        )
        .to(beamGlowRef.current, { opacity: 0, ease: "power1.in", duration: 0.14 }, 0.46)
        .to(beamCoreRef.current, { opacity: 0, ease: "power1.in", duration: 0.14 }, 0.46);

      // Coral sun rises + expands (0.50 - 0.70) — fully hidden below the fold until this phase
      tl.fromTo(
        circleRef.current,
        { y: 340, scale: 0.3, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, ease: "power2.inOut", duration: 0.2 },
        0.5
      );

      // Upper atmosphere darkens through the transition and settles (0.35 - 1.0)
      tl.fromTo(darkenRef.current, { opacity: 0 }, { opacity: 1, ease: "power1.inOut", duration: 0.65 }, 0.35);

      // Headline 2 + pill (0.65 - 0.82)
      tl.fromTo(pill2Ref.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, ease: "power2.out", duration: 0.08 }, 0.65)
        .fromTo(headline2Ref.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, ease: "power2.out", duration: 0.12 }, 0.68);

      // Dashboard rises (0.75 - 0.95)
      tl.fromTo(
        mockupRiseRef.current,
        { y: 130, opacity: 0, scale: 0.94 },
        { y: 0, opacity: 1, scale: 1, ease: "power2.out", duration: 0.2 },
        0.75
      );

      // ---- One-time autoplay intro (landscape + beam + headline, not scroll-linked) ----
      const intro = gsap.timeline({ defaults: { ease: "power2.out" } });
      intro
        .fromTo(viewportRef.current, { opacity: 0 }, { opacity: 1, duration: 1.1 })
        .fromTo(
          [farMtnRef.current, backMtnRef.current, midMtnRef.current, foreMtnRef.current],
          { opacity: 0 },
          { opacity: 1, duration: 1 },
          0.1
        )
        .fromTo(beamGlowRef.current, { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 0.9, transformOrigin: "bottom" }, 0.5)
        .fromTo(beamCoreRef.current, { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 0.9, transformOrigin: "bottom" }, 0.5)
        .fromTo(towerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.5)
        .fromTo(headline1Ref.current, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.7 }, 1.0);
    }, pinRef);

    return () => ctx.revert();
  }, [prefersReducedMotion]);

  const settled = prefersReducedMotion;

  return (
    <>
      {/* Stable anchor target for the "Product" nav link — GSAP pins/repositions
          pinRef itself, so an id on that element resolves incorrectly once scrolled. */}
      <div id="dashboard" aria-hidden="true" />
      <div ref={pinRef} className="relative h-screen w-full overflow-hidden" style={{ backgroundColor: INK }}>
      <div className="flex h-full w-full items-center justify-center">
        <div
          ref={viewportRef}
          className={`relative h-[84vh] w-[94vw] overflow-hidden rounded-[20px] ${settled ? "" : ""}`}
          style={{
            backgroundColor: DEEP,
            boxShadow: `0 0 0 1px ${PRIMARY}33, 0 50px 140px -30px ${PRIMARY}4d, 0 0 80px -10px ${PINK}22`,
            opacity: settled ? 1 : undefined,
          }}
        >
          {/* Sky */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, ${DEEP} 0%, #260e18 32%, ${MAROON} 55%, ${HOVER} 76%, ${PRIMARY} 100%)`,
            }}
          />

          {/* Clouds */}
          <div ref={cloudsRef} className={`absolute inset-0 ${settled ? "opacity-0" : ""}`} style={{ willChange: "transform, opacity" }} aria-hidden="true">
            <div className="absolute left-[6%] top-[8%] h-[22%] w-[38%] rounded-full opacity-40 blur-xl sm:blur-2xl" style={{ background: `radial-gradient(closest-side, ${BEIGE}, transparent)` }} />
            <div className="absolute right-[4%] top-[4%] h-[26%] w-[42%] rounded-full opacity-30 blur-xl sm:blur-2xl" style={{ background: `radial-gradient(closest-side, ${BEIGE}, transparent)` }} />
            <div className="hidden opacity-25 blur-3xl sm:absolute sm:left-[26%] sm:top-[16%] sm:block sm:h-[16%] sm:w-[46%] sm:rounded-full" style={{ background: `radial-gradient(closest-side, ${BEIGE}, transparent)` }} />
          </div>

          {/* Mountains — organic bezier ridgelines, 4 depth layers */}
          <div ref={farMtnRef} className={`absolute inset-x-0 bottom-0 h-[58%] ${settled ? "opacity-0" : ""}`} style={{ willChange: "transform, opacity" }} aria-hidden="true">
            <svg viewBox="0 0 1600 440" preserveAspectRatio="none" className="h-full w-full">
              <path
                d="M0,280 C130,240 240,270 380,238 C520,206 610,250 760,222 C890,198 970,240 1110,214 C1250,188 1340,228 1480,206 C1530,198 1570,212 1600,206 L1600,440 L0,440 Z"
                fill="#1c0f0c"
                opacity="0.65"
              />
            </svg>
          </div>

          <div ref={backMtnRef} className={`absolute inset-x-0 bottom-0 h-[50%] ${settled ? "opacity-0" : ""}`} style={{ willChange: "transform, opacity" }} aria-hidden="true">
            <svg viewBox="0 0 1600 420" preserveAspectRatio="none" className="h-full w-full">
              <path
                d="M0,300 C120,250 220,290 340,255 C460,220 540,270 660,245 C790,218 880,265 1010,240 C1140,215 1230,260 1360,235 C1460,216 1540,245 1600,232 L1600,420 L0,420 Z"
                fill="#2a1512"
                opacity="0.9"
              />
            </svg>
          </div>

          <div ref={midMtnRef} className={`absolute inset-x-0 bottom-0 h-[42%] ${settled ? "opacity-0" : ""}`} style={{ willChange: "transform, opacity" }} aria-hidden="true">
            <svg viewBox="0 0 1600 380" preserveAspectRatio="none" className="h-full w-full">
              <path
                d="M0,320 C140,270 240,315 360,275 C500,232 600,300 740,260 C860,226 950,290 1090,255 C1220,222 1320,280 1460,248 C1520,235 1570,255 1600,245 L1600,380 L0,380 Z"
                fill={MAROON}
              />
            </svg>
          </div>

          <div ref={foreMtnRef} className={`absolute inset-x-0 bottom-0 h-[32%] ${settled ? "opacity-0" : ""}`} style={{ willChange: "transform, opacity" }} aria-hidden="true">
            <svg viewBox="0 0 1600 300" preserveAspectRatio="none" className="h-full w-full">
              <path
                d="M0,240 C160,190 260,235 420,200 C560,170 660,220 800,190 C920,165 1020,210 1160,185 C1290,162 1380,205 1600,178 L1600,300 L0,300 Z"
                fill="#0c0605"
              />
            </svg>
          </div>

          {/* Tiny rocket silhouette at the foreground ridge peak — the beam is its exhaust trail */}
          <div
            ref={towerRef}
            className={`absolute bottom-[24%] left-1/2 h-[34px] w-[14px] -translate-x-1/2 ${settled ? "opacity-0" : ""}`}
            style={{ willChange: "opacity" }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 60" className="h-full w-full">
              <path
                d="M12,0 C16,9 17.5,24 17.5,36 L17.5,48 L6.5,48 L6.5,36 C6.5,24 8,9 12,0 Z"
                fill="#0c0605"
              />
              <path d="M6.5,40 L0.5,54 L6.5,48 Z" fill="#0c0605" />
              <path d="M17.5,40 L23.5,54 L17.5,48 Z" fill="#0c0605" />
            </svg>
          </div>

          {/* Coral fog near the horizon — subtle warm wash, kept low so mountain contrast survives */}
          <div
            ref={fogRef}
            className={`absolute inset-x-0 bottom-[16%] h-[20%] opacity-40 ${settled ? "!opacity-0" : ""}`}
            style={{ background: `linear-gradient(180deg, transparent 0%, ${PRIMARY}35 100%)`, willChange: "opacity" }}
            aria-hidden="true"
          />

          {/* Beam: soft glow + sharp core */}
          <div
            ref={beamGlowRef}
            className={`absolute bottom-[24%] left-1/2 h-[42%] w-[16px] -translate-x-1/2 blur-md ${settled ? "opacity-0" : ""}`}
            style={{ background: `linear-gradient(0deg, ${PRIMARY} 0%, ${PINK}aa 55%, transparent 100%)`, willChange: "transform, opacity" }}
            aria-hidden="true"
          />
          <div
            ref={beamCoreRef}
            className={`absolute bottom-[24%] left-1/2 h-[42%] w-[2px] -translate-x-1/2 ${settled ? "opacity-0" : ""}`}
            style={{
              background: `linear-gradient(0deg, #fff 0%, ${PINK} 45%, transparent 100%)`,
              boxShadow: `0 0 16px 2px ${PRIMARY}bb`,
              willChange: "transform, opacity",
            }}
            aria-hidden="true"
          />

          {/* Huge coral sun */}
          <div
            ref={circleRef}
            className="absolute bottom-[-30%] left-1/2 h-[1100px] w-[1100px] -translate-x-1/2 rounded-full"
            style={{
              background: `radial-gradient(circle, ${PINK} 0%, ${PRIMARY} 32%, ${MAROON_DEEP} 60%, ${INK}00 74%)`,
              opacity: settled ? 1 : undefined,
              transform: settled ? "translateX(-50%) translateY(0) scale(1)" : undefined,
              willChange: "transform, opacity",
            }}
            aria-hidden="true"
          />

          {/* Progressive darken for the settle phase */}
          <div
            ref={darkenRef}
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 50% 118%, transparent 0%, transparent 18%, ${INK}f2 60%)`,
              opacity: settled ? 1 : 0,
            }}
            aria-hidden="true"
          />

          {/* Grain — desktop only; mix-blend-mode forces a full-viewport recomposite on
              every scrub frame, which is the kind of cost mobile GPUs feel most. */}
          <div
            className="pointer-events-none absolute inset-0 hidden opacity-[0.05] sm:block"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
            aria-hidden="true"
          />

          {/* Vignette — a radial gradient reads the same as a blurred inset box-shadow
              but is far cheaper to paint (no CPU-rasterized shadow blur). */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)" }}
            aria-hidden="true"
          />

          {/* Nav — inside the top of the viewport */}
          <header className="absolute inset-x-0 top-0 z-30 px-5 py-4 sm:px-8 sm:py-5">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2.5">
                <img src="/logo.png" alt="Inventra logo" className="h-7 w-7 object-contain" />
                <span className="text-xs font-black tracking-[0.28em] text-white">INVENTRA</span>
              </Link>

              <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-black/40 px-2 py-1.5 md:flex">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="rounded-full px-3.5 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>

              <div className="hidden items-center gap-3 md:flex">
                <Link to="/login" className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-100 transition-colors hover:text-white">
                  Login
                </Link>
                <Link
                  to="/login"
                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#150b0d] shadow-[0_14px_28px_-10px_rgba(0,0,0,0.5)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100"
                >
                  Get Started
                </Link>
              </div>

              <button
                type="button"
                onClick={() => setMobileNavOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/50 text-slate-200 md:hidden"
                aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileNavOpen}
              >
                {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>

            {mobileNavOpen && (
              <div className="mt-3 rounded-2xl border border-white/10 bg-[#150b0d] p-4 md:hidden">
                <div className="flex flex-col gap-3">
                  {NAV_LINKS.map((link) => (
                    <a key={link.label} href={link.href} onClick={() => setMobileNavOpen(false)} className="text-sm font-medium text-slate-200">
                      {link.label}
                    </a>
                  ))}
                  <div className="mt-1 flex gap-3 border-t border-white/10 pt-3">
                    <Link to="/login" className="flex-1 rounded-xl border border-white/15 px-4 py-2 text-center text-sm font-semibold text-slate-100">
                      Login
                    </Link>
                    <Link to="/login" className="flex-1 rounded-xl bg-white px-4 py-2 text-center text-sm font-semibold text-[#150b0d]">
                      Get Started
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </header>

          {/* Headline 1 */}
          <div ref={headline1Ref} className={`absolute inset-x-0 top-[56%] px-6 text-center ${settled ? "opacity-0" : ""}`} style={{ willChange: "transform, opacity" }}>
            <h1
              className="mx-auto max-w-3xl font-serif text-[1.7rem] uppercase leading-[0.95] tracking-wide sm:text-5xl"
              style={{ color: BEIGE }}
            >
              Master your inventory.
              <br />
              Command what&apos;s next.
            </h1>
            <p className="mx-auto mt-4 max-w-sm text-sm sm:text-base" style={{ color: `${BEIGE}c0` }}>
              The inventory and parcel-tracking system built for T-shirt and apparel businesses.
            </p>
          </div>

          {/* Headline 2 + pill — closer to the top on mobile so the dashboard has room */}
          <div className="absolute inset-x-0 top-[10%] px-6 text-center sm:top-[25%]">
            <div
              ref={pill2Ref}
              className={`mx-auto mb-3 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-1.5 text-xs font-medium text-slate-100 sm:mb-5 ${settled ? "" : "opacity-0"}`}
              style={{ willChange: "transform, opacity" }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Live inventory &amp; parcel tracking
            </div>
            <h2
              ref={headline2Ref}
              className={`mx-auto max-w-xl font-serif text-xl leading-[1.05] sm:text-3xl sm:leading-[0.98] md:text-4xl ${settled ? "" : "opacity-0"}`}
              style={{ color: BEIGE, willChange: "transform, opacity" }}
            >
              Everything stock-related,
              <br />
              in one place.
            </h2>
          </div>

          {/* Dashboard — rises from the bottom, ~53% of viewport width on desktop; wider + simplified on mobile */}
          <div
            ref={mockupRiseRef}
            className={`absolute inset-x-0 bottom-[2%] mx-auto w-[90%] sm:w-[75%] md:w-[53%] ${settled ? "" : "opacity-0"}`}
            style={{ willChange: "transform, opacity" }}
          >
            <div ref={floatRef} className={prefersReducedMotion ? "" : "animate-[floatY_6s_ease-in-out_infinite]"}>
              <DashboardMockup />
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

const STAT_TILES = [
  { label: "Total Stock", value: "12,480", tone: "text-emerald-300" },
  { label: "Warning", value: "36", tone: "text-amber-300" },
  { label: "Critical", value: "9", tone: "text-orange-300" },
  { label: "Out of Stock", value: "2", tone: "text-rose-300" },
];

const ATTENTION_ROWS = [
  { name: "Printed T-Shirt · XL", meta: "4 left · Sunkool", tone: "bg-orange-300" },
  { name: "Puma Polo · L", meta: "0 left · Reorder now", tone: "bg-rose-300" },
  { name: "Plain Tee · M", meta: "18 left · Ceramic Shield", tone: "bg-amber-300" },
];

function DashboardMockup() {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-white/10 shadow-[0_-20px_80px_-20px_rgba(232,135,156,0.4),0_30px_80px_-20px_rgba(0,0,0,0.7)]"
      style={{ backgroundColor: "rgba(17,9,11,0.97)" }}
    >
      <div className="flex items-center gap-3 border-b border-white/10 bg-black/30 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#ff5f56]" />
          <span className="h-2 w-2 rounded-full bg-[#ffbd2e]" />
          <span className="h-2 w-2 rounded-full bg-[#27c93f]" />
        </div>
        <div className="mx-auto flex w-full max-w-[220px] items-center justify-center rounded-md bg-white/5 px-3 py-1 text-[10px] text-slate-400">
          app.inventra.io/dashboard
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:p-5">
        <p className="text-[10px] uppercase tracking-wide text-slate-400">Stock Health Overview</p>

        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {STAT_TILES.map((tile) => (
            <div key={tile.label} className="rounded-lg border border-white/10 bg-white/[0.04] p-1.5 sm:p-2.5">
              <p className="text-[8px] text-slate-400 sm:text-[10px]">{tile.label}</p>
              <p className={`mt-0.5 text-xs font-bold sm:mt-1 sm:text-lg ${tile.tone}`}>{tile.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[1.3fr_1fr] gap-2 sm:gap-3">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2 sm:p-3">
            <p className="mb-1 text-[8px] font-semibold uppercase tracking-wide text-slate-400 sm:mb-2 sm:text-[10px]">
              Stock movement — 7 days
            </p>
            <div className="flex h-8 items-end gap-1 sm:h-14 sm:gap-1.5">
              {[38, 52, 44, 68, 58, 74, 46].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: `linear-gradient(0deg, ${PRIMARY} 0%, ${PINK} 100%)` }} />
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2 sm:p-3">
            <p className="mb-1 text-[8px] font-semibold uppercase tracking-wide text-slate-400 sm:mb-1.5 sm:text-[10px]">
              Attention needed
            </p>
            <div className="flex flex-col gap-1 sm:gap-1.5">
              {ATTENTION_ROWS.map((row) => (
                <div key={row.name} className="flex items-center justify-between gap-1 text-[9px] sm:text-xs">
                  <div className="min-w-0">
                    <p className="truncate text-slate-200">{row.name}</p>
                    <p className="hidden truncate text-[10px] text-slate-500 sm:block">{row.meta}</p>
                  </div>
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${row.tone}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
