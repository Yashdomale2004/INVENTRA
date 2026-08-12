import { motion } from "framer-motion";

const IMAGE_SRC = "/skeleton-hero.png";

/** Renders the existing skeleton-hero.png as-is, with a subtle floating
 * animation. No overlay elements — just the original artwork. */
export function GhostIllustration({
  className = "",
  disableMotion = false,
}: {
  className?: string;
  disableMotion?: boolean;
}) {
  return (
    <div className={`relative aspect-[1103/960] w-full ${className}`}>
      <motion.img
        src={IMAGE_SRC}
        alt="Illustration of a skeleton working at a laptop"
        className="absolute inset-0 h-full w-full rounded-[1.75rem] object-contain shadow-[0_20px_50px_-20px_rgba(22,119,255,0.35)]"
        animate={disableMotion ? undefined : { y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
