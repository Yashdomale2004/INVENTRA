export type StockStatus = "out_of_stock" | "critical" | "warning" | "healthy";

// Dark maroon (#6b0f24, brightened to #8f1830 in dark mode for contrast against
// near-black cards) used for the Out of Stock state. Written as full literal
// Tailwind classes below rather than built from a shared constant — Tailwind's
// scanner needs the complete `bg-[#...]` token in source to generate the CSS.

/**
 * Fixed absolute quantity bands — deliberately independent of a product's
 * configured minimum_stock. A product with no minimum set (0) used to always
 * read as "healthy" the moment it had any stock at all, e.g. Ceramic Shield
 * at 10 PCS showing Healthy instead of Critical. Status now depends only on
 * the raw quantity on hand.
 */
const HEALTHY_THRESHOLD = 500; // 500+ => healthy
const LOW_THRESHOLD = 200; // 200-499 => low (warning)
// 1-199 => critical, 0 => out of stock

export function getStockStatus(currentStock: number): StockStatus {
  if (currentStock <= 0) return "out_of_stock";
  if (currentStock < LOW_THRESHOLD) return "critical";
  if (currentStock < HEALTHY_THRESHOLD) return "warning";
  return "healthy";
}

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  out_of_stock: "OUT OF STOCK",
  critical: "Low Stock",
  warning: "Approaching Minimum",
  healthy: "In Stock",
};

export const STOCK_STATUS_DOT_CLASS: Record<StockStatus, string> = {
  out_of_stock: "bg-[#6b0f24] dark:bg-[#8f1830]",
  critical: "bg-rose-500",
  warning: "bg-amber-500",
  healthy: "bg-emerald-500",
};

export const STOCK_STATUS_BADGE_CLASS: Record<StockStatus, string> = {
  out_of_stock: "bg-[#6b0f24] text-white dark:bg-[#8f1830] dark:text-white",
  critical: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  healthy: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
};

/** Compact label for tight spaces (stat tiles, size chips) — full sentence lives in STOCK_STATUS_LABEL. */
export const STOCK_STATUS_SHORT_LABEL: Record<StockStatus, string> = {
  out_of_stock: "Out of Stock",
  critical: "Critical",
  warning: "Low",
  healthy: "Healthy",
};

export const STOCK_STATUS_BAR_CLASS: Record<StockStatus, string> = {
  out_of_stock: "bg-[#6b0f24] dark:bg-[#8f1830]",
  critical: "bg-rose-500",
  warning: "bg-amber-500",
  healthy: "bg-emerald-500",
};

/** True for the statuses that should ever raise a low-stock notification. */
export function isLowStockStatus(status: StockStatus): boolean {
  return status === "out_of_stock" || status === "critical";
}

/** Fill percentage for a size's stock bar, scaled against the same healthy threshold as getStockStatus. */
export function getStockBarPercent(currentStock: number): number {
  if (currentStock <= 0) return 0;
  return Math.max(6, Math.min(100, Math.round((currentStock / HEALTHY_THRESHOLD) * 100)));
}
