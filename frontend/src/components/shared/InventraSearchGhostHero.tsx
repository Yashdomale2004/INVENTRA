import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Package, PackageCheck, Search, Sparkles, Truck } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Decorative hero animation for the login page's illustration panel: a ghost
 * mascot peeks at a mock search bar, "types" a sample query, and reacts to
 * fake result cards. Entirely self-contained — the search bar/results here
 * are illustration only and never touch the real login form.
 */

type Phase = "reset" | "enter" | "look" | "peek" | "typing" | "submit" | "results" | "happy";

const PHASE_ORDER: Phase[] = ["reset", "enter", "look", "peek", "typing", "submit", "results", "happy"];

const QUERY = "Printed T-Shirt XL";

const RESULTS = [
  { icon: Package, label: "Printed T-Shirt XL", meta: "24 in stock" },
  { icon: PackageCheck, label: "Sunkool Hoodie", meta: "In stock" },
  { icon: Truck, label: "Order INV-204", meta: "Dispatched" },
];

const PHASE_DURATIONS: Record<Phase, number> = {
  reset: 500,
  enter: 800,
  look: 700,
  peek: 700,
  typing: 1900,
  submit: 350,
  results: 1500,
  happy: 1400,
};

type Pose = { x: number; y: number; rotate: number; scale: number; opacity: number };

const GHOST_POSE: Record<Phase, Pose> = {
  reset: { x: 52, y: -78, rotate: -8, scale: 0.82, opacity: 0 },
  enter: { x: 40, y: -60, rotate: -6, scale: 0.88, opacity: 1 },
  look: { x: 16, y: -40, rotate: -2, scale: 0.95, opacity: 1 },
  peek: { x: -4, y: -12, rotate: 0, scale: 1, opacity: 1 },
  typing: { x: -4, y: -12, rotate: 0, scale: 1, opacity: 1 },
  submit: { x: -4, y: -16, rotate: 0, scale: 1.04, opacity: 1 },
  results: { x: -8, y: -20, rotate: 3, scale: 1.02, opacity: 1 },
  happy: { x: -8, y: -28, rotate: -5, scale: 1.08, opacity: 1 },
};

const EYE_LOOK: Record<Phase, { x: number; y: number }> = {
  reset: { x: 0, y: -1 },
  enter: { x: 0, y: -1 },
  look: { x: -1, y: 1 },
  peek: { x: -1, y: 2 },
  typing: { x: -1, y: 2 },
  submit: { x: 0, y: 1 },
  results: { x: 1, y: 0 },
  happy: { x: 0, y: -1 },
};

const MAGNIFIER_VISIBLE: Phase[] = ["peek", "typing", "submit", "results", "happy"];
const CURSOR_VISIBLE: Phase[] = ["peek", "typing"];
const RESULTS_VISIBLE: Phase[] = ["results", "happy"];
const HAPPY_FACE: Phase[] = ["results", "happy"];

export function InventraSearchGhostHero({ className = "" }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("enter");
  const [typedLength, setTypedLength] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion) {
      setPhase("happy");
      setTypedLength(QUERY.length);
      return;
    }

    let cancelled = false;
    let typingInterval: ReturnType<typeof setInterval> | undefined;

    if (phase === "typing") {
      setTypedLength(0);
      let count = 0;
      typingInterval = setInterval(() => {
        count += 1;
        if (cancelled) return;
        setTypedLength(count);
        if (count >= QUERY.length && typingInterval) clearInterval(typingInterval);
      }, PHASE_DURATIONS.typing / QUERY.length);
    } else if (phase === "reset") {
      setTypedLength(0);
    }

    const timeout = setTimeout(() => {
      if (cancelled) return;
      const nextIndex = (PHASE_ORDER.indexOf(phase) + 1) % PHASE_ORDER.length;
      setPhase(PHASE_ORDER[nextIndex]);
    }, PHASE_DURATIONS[phase]);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      if (typingInterval) clearInterval(typingInterval);
    };
  }, [phase, prefersReducedMotion]);

  const pose = GHOST_POSE[phase];
  const eye = EYE_LOOK[phase];
  const pupilX = phase === "typing" ? -3 + (typedLength / QUERY.length) * 6 : eye.x;
  const showMagnifier = MAGNIFIER_VISIBLE.includes(phase);
  const showCursor = CURSOR_VISIBLE.includes(phase);
  const showResults = RESULTS_VISIBLE.includes(phase);
  const isHappyFace = HAPPY_FACE.includes(phase);
  const typedText = QUERY.slice(0, typedLength);

  const spring = prefersReducedMotion ? { duration: 0 } : { type: "spring" as const, stiffness: 170, damping: 20 };

  return (
    <div className={`flex w-full flex-col items-center ${className}`} role="img" aria-label="Illustration of a ghost mascot searching INVENTRA inventory">
      <div className="relative h-[132px] w-[132px]">
        <motion.div
          className="absolute bottom-0 left-1/2 -ml-[52px]"
          animate={{ x: pose.x, y: pose.y, rotate: pose.rotate, scale: pose.scale, opacity: pose.opacity }}
          transition={spring}
        >
          <svg viewBox="0 0 120 130" className="h-[104px] w-[104px] drop-shadow-[0_12px_18px_rgba(122,33,69,0.25)]">
            <path
              d="M10,70 C10,35 32,10 60,10 C88,10 110,35 110,70 L110,102 C104,96 96,110 90,102 C84,94 76,110 70,102 C64,94 56,110 50,102 C44,94 36,110 30,102 C24,94 16,108 10,100 Z"
              fill="#FFF9F2"
              stroke="#C9855A"
              strokeWidth="2"
            />
            <ellipse cx="38" cy="70" rx="6" ry="4" fill="#F4B7A0" opacity="0.55" />
            <ellipse cx="82" cy="70" rx="6" ry="4" fill="#F4B7A0" opacity="0.55" />

            <motion.g animate={{ x: pupilX, y: eye.y }} transition={{ type: "spring", stiffness: 220, damping: 22 }}>
              <circle cx="44" cy="56" r="7.5" fill="#FFFFFF" stroke="#7A2145" strokeWidth="1.5" />
              <circle cx="76" cy="56" r="7.5" fill="#FFFFFF" stroke="#7A2145" strokeWidth="1.5" />
              <circle cx="44" cy="57" r="3.2" fill="#5B1730" />
              <circle cx="76" cy="57" r="3.2" fill="#5B1730" />
            </motion.g>

            <AnimatePresence mode="wait" initial={false}>
              {isHappyFace ? (
                <motion.path
                  key="happy"
                  d="M44,74 Q60,90 76,74"
                  fill="none"
                  stroke="#5B1730"
                  strokeWidth="3"
                  strokeLinecap="round"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              ) : (
                <motion.path
                  key="neutral"
                  d="M48,76 Q60,82 72,76"
                  fill="none"
                  stroke="#5B1730"
                  strokeWidth="3"
                  strokeLinecap="round"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              )}
            </AnimatePresence>

            <motion.g
              animate={{ scale: showMagnifier ? 1 : 0, opacity: showMagnifier ? 1 : 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              style={{ transformOrigin: "96px 96px" }}
            >
              <line x1="88" y1="104" x2="80" y2="112" stroke="#7A2145" strokeWidth="3" strokeLinecap="round" />
              <circle cx="96" cy="96" r="11" fill="rgba(255,255,255,0.5)" stroke="#7A2145" strokeWidth="3" />
            </motion.g>
          </svg>

          <AnimatePresence>
            {phase === "happy" &&
              [0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="absolute text-[#C9855A]"
                  style={{ left: `${8 + i * 40}px`, top: `${-6 - (i % 2) * 14}px` }}
                  initial={{ opacity: 0, scale: 0.4, y: 4 }}
                  animate={{ opacity: [0, 1, 0], scale: [0.4, 1, 0.8], y: [4, -6, -12] }}
                  transition={{ duration: 1.1, delay: i * 0.15 }}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </motion.span>
              ))}
          </AnimatePresence>
        </motion.div>
      </div>

      <div className="mt-1 w-full max-w-[260px]">
        <div className="flex items-center gap-2 rounded-2xl border border-[#E7C7A6] bg-white/95 px-3 py-2.5 shadow-[0_14px_30px_-18px_rgba(122,33,69,0.45)]">
          <motion.span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7A2145]/10 text-[#7A2145]"
            animate={{ scale: phase === "submit" ? 1.25 : 1, rotate: phase === "submit" ? -14 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 14 }}
          >
            <Search className="h-3.5 w-3.5" />
          </motion.span>
          <div className="min-w-0 flex-1 truncate text-left text-[13px] font-medium text-slate-700">
            {typedText || <span className="text-slate-300">Search inventory…</span>}
            {showCursor && (
              <span
                aria-hidden="true"
                className="ml-0.5 inline-block h-3.5 w-[1.5px] -translate-y-[1px] animate-[blink_1s_steps(1)_infinite] bg-[#7A2145] align-middle"
              />
            )}
          </div>
        </div>

        <div className="mt-2.5 min-h-[104px] space-y-2">
          <AnimatePresence>
            {showResults &&
              RESULTS.map((result, i) => (
                <motion.div
                  key={result.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3, delay: prefersReducedMotion ? 0 : i * 0.12 }}
                  className="flex items-center gap-2 rounded-xl border border-[#EEDCC5] bg-white/85 px-2.5 py-1.5 text-left shadow-sm"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#7A2145]/10 text-[#7A2145]">
                    <result.icon className="h-3 w-3" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-slate-700">{result.label}</span>
                  <span className="shrink-0 text-[10.5px] font-medium text-[#8A5A46]">{result.meta}</span>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
