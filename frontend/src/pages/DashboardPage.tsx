import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { EmptyState } from "../components/shared/EmptyState";
import { Card } from "../components/ui/card";
import { INVENTORY_SYNC_EVENT } from "../lib/inventorySync";
import { fetchInventoryByBrand } from "../services/inventory";

export function DashboardPage() {
  const queryClient = useQueryClient();
  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["inventory-by-brand"],
    queryFn: fetchInventoryByBrand,
  });

  useEffect(() => {
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["inventory-by-brand"] });
    window.addEventListener(INVENTORY_SYNC_EVENT, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(INVENTORY_SYNC_EVENT, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [queryClient]);

  const totalStock = brands.reduce((sum, b) => sum + b.total, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100">Inventory Dashboard</h2>
        <p className="mt-1 text-sm text-slate-500">Live stock synced from Supabase inventory.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Total Stock</p>
          <p className="mt-4 text-4xl font-semibold text-slate-900 dark:text-slate-100">
            {isLoading ? "—" : totalStock}
          </p>
        </Card>
        <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Brands</p>
          <p className="mt-4 text-4xl font-semibold text-slate-900 dark:text-slate-100">
            {isLoading ? "—" : brands.length}
          </p>
        </Card>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <EmptyState title="Loading inventory" description="Fetching live stock from Supabase..." />
        ) : brands.length === 0 ? (
          <EmptyState title="No stock available" description="Add stock via Stock Up to see it here." />
        ) : (
          brands.map((brand) => (
            <Card key={brand.brandName} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-bold text-slate-900 dark:text-slate-100">{brand.brandName}</p>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{brand.total} pcs total</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {brand.sizes.map(({ size, stock }) => (
                  <div key={size} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/70">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{size}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{stock}</p>
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
