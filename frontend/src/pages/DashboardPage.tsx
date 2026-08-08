import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertOctagon, AlertTriangle, Boxes, CheckCircle2, PackageX } from "lucide-react";

import { EmptyState } from "../components/shared/EmptyState";
import { Card } from "../components/ui/card";
import { INVENTORY_SYNC_EVENT } from "../lib/inventorySync";
import {
  getStockBarPercent,
  STOCK_STATUS_BADGE_CLASS,
  STOCK_STATUS_BAR_CLASS,
  STOCK_STATUS_SHORT_LABEL,
  type StockStatus,
} from "../lib/stockStatus";
import { fetchDashboardOverview, type ProductStockOverview } from "../services/inventory";

const STATUS_TILES: { status: StockStatus; icon: typeof CheckCircle2 }[] = [
  { status: "healthy", icon: CheckCircle2 },
  { status: "warning", icon: AlertTriangle },
  { status: "critical", icon: AlertOctagon },
  { status: "out_of_stock", icon: PackageX },
];

const STATUS_TILE_ICON_CLASS: Record<StockStatus, string> = {
  healthy: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300",
  critical: "bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300",
  out_of_stock: "bg-[#6b0f24]/10 text-[#6b0f24] dark:bg-[#6b0f24]/30 dark:text-[#e8879c]",
};

// out_of_stock first, then critical, then warning — worst items surface first
const ATTENTION_RANK: Record<StockStatus, number> = { out_of_stock: 0, critical: 1, warning: 2, healthy: 3 };

type AttentionItem = {
  key: string;
  productName: string;
  brandName: string;
  size: string;
  stock: number;
  minimumStock: number;
  status: StockStatus;
};

/** Every size sitting at warning/critical/out-of-stock, worst-first. Derived from the same live overview query — no extra fetch. */
function getAttentionItems(products: ProductStockOverview[]): AttentionItem[] {
  return products
    .flatMap((product) =>
      product.sizes
        .filter((size) => size.status !== "healthy")
        .map((size) => ({
          key: `${product.id}-${size.size}`,
          productName: product.name,
          brandName: product.brandName,
          size: size.size,
          stock: size.stock,
          minimumStock: size.minimumStock,
          status: size.status,
        }))
    )
    .sort((a, b) => ATTENTION_RANK[a.status] - ATTENTION_RANK[b.status] || a.stock - b.stock);
}

function LiveBadge() {
  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
      </span>
      Live
    </span>
  );
}

export function DashboardPage() {
  const queryClient = useQueryClient();
  const { data: overview, isLoading } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: fetchDashboardOverview,
  });

  useEffect(() => {
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
    window.addEventListener(INVENTORY_SYNC_EVENT, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(INVENTORY_SYNC_EVENT, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [queryClient]);

  const products = overview?.products ?? [];
  const attentionItems = useMemo(() => getAttentionItems(overview?.products ?? []), [overview]);

  return (
    <div className="w-full min-w-0 space-y-5 pb-8">
      <div className="min-w-0 space-y-1">
        <h2 className="truncate text-2xl font-black text-slate-900 dark:text-slate-100 sm:text-3xl">Stock Health Overview</h2>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <p className="min-w-0 truncate text-sm text-slate-500 dark:text-slate-400">
            {isLoading || !overview
              ? "Fetching live stock from Supabase..."
              : `${overview.totalProducts} product${overview.totalProducts === 1 ? "" : "s"} across ${overview.totalBrands} brand${overview.totalBrands === 1 ? "" : "s"}.`}
          </p>
          <LiveBadge />
        </div>
      </div>

      <Card className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
            <Boxes className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-400 sm:tracking-[0.2em]">Total Stock</p>
            <p className="mt-1 truncate text-3xl font-black text-slate-900 dark:text-slate-100 sm:text-4xl">
              {isLoading ? "—" : (overview?.totalStock ?? 0)}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        {STATUS_TILES.map(({ status, icon: Icon }) => (
          <Card
            key={status}
            className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-4"
          >
            <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${STATUS_TILE_ICON_CLASS[status]}`}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="mt-2 truncate text-2xl font-bold text-slate-900 dark:text-slate-100">
              {isLoading ? "—" : (overview?.statusCounts[status] ?? 0)}
            </p>
            <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400">{STOCK_STATUS_SHORT_LABEL[status]}</p>
          </Card>
        ))}
      </div>

      {attentionItems.length ? (
        <Card className="min-w-0 rounded-3xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm dark:border-amber-900 dark:bg-amber-950/10 sm:p-5">
          <div className="mb-3 min-w-0">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <h3 className="flex min-w-0 items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="truncate">Attention Needed</span>
              </h3>
              <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                {attentionItems.length}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-amber-700/80 dark:text-amber-400/80">Low, critical, and out-of-stock sizes</p>
          </div>
          <div className="space-y-2">
            {attentionItems.map((item) => (
              <div
                key={item.key}
                className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-amber-100 bg-white px-3 py-2.5 dark:border-amber-900/50 dark:bg-slate-950"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {item.productName} <span className="text-slate-400">({item.size})</span>
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {item.brandName} &middot; {item.stock} left &middot; min {item.minimumStock}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STOCK_STATUS_BADGE_CLASS[item.status]}`}>
                  {STOCK_STATUS_SHORT_LABEL[item.status]}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="space-y-3">
        {isLoading ? (
          <EmptyState title="Loading inventory" description="Fetching live stock from Supabase..." />
        ) : products.length === 0 ? (
          <EmptyState title="No stock available" description="Add stock via Stock Up to see it here." />
        ) : (
          products.map((product) => (
            <Card
              key={product.id}
              className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5"
            >
              <div className="flex min-w-0 items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-slate-900 dark:text-slate-100">{product.name}</p>
                  <p className="truncate text-xs text-slate-400">{product.brandName}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">{product.total} pcs</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                {product.sizes.map((sizeRow) => (
                  <div
                    key={sizeRow.size}
                    className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/70"
                  >
                    <div className="flex min-w-0 items-center justify-between gap-1.5">
                      <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-slate-500">{sizeRow.size}</p>
                      <p className="min-w-0 truncate text-sm font-bold text-slate-900 dark:text-slate-100">{sizeRow.stock}</p>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all ${STOCK_STATUS_BAR_CLASS[sizeRow.status]}`}
                        style={{ width: `${getStockBarPercent(sizeRow.stock)}%` }}
                      />
                    </div>
                    <div className="mt-1.5 min-w-0 space-y-0.5">
                      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {STOCK_STATUS_SHORT_LABEL[sizeRow.status]}
                      </p>
                      <p className="truncate text-[10px] text-slate-400">Min {sizeRow.minimumStock}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
