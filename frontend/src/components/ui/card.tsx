import type { HTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/50 bg-white/70 p-5 shadow-glass backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/70",
        className
      )}
      {...props}
    />
  );
}
