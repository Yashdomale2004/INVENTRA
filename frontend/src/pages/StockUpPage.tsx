import { ChevronDown, Shirt } from "lucide-react";
import { useEffect, useState } from "react";
import type { SelectHTMLAttributes } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { getErrorMessage } from "../lib/errors";
import { STOCK_DRAFT_KEY, STOCK_LOG_KEY, notifyInventorySync } from "../lib/inventorySync";
import { stockUpToSupabase, type StockUpEntry } from "../services/inventory";

type SizeName = "S" | "M" | "L" | "XL" | "XXL";
type SizeQuantities = Record<SizeName, string>;
type CategoryKey = "plain" | "printed" | "puma";

type StoredStockEntry = {
  id: string;
  category: string;
  productName: string;
  size: SizeName;
  quantity: number;
  createdAt: string;
};

const sizeOrder: SizeName[] = ["S", "M", "L", "XL", "XXL"];
const printedProducts = ["Ceramic Shield", "Sunkool", "RS"];

// Maps Stock Up category labels to Supabase category names
const CATEGORY_MAP: Record<string, string> = {
  "plain t-shirts": "T-Shirts",
  "printed t-shirts": "Printed T-Shirts",
  "puma t-shirts": "Sportswear",
};

function emptyQuantities(): SizeQuantities {
  return { S: "0", M: "0", L: "0", XL: "0", XXL: "0" };
}

function quantityToNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      {...props}
    />
  );
}

export function StockUpPage() {
  const queryClient = useQueryClient();

  const [expanded, setExpanded] = useState<Record<CategoryKey, boolean>>({ plain: false, printed: false, puma: false });

  const [plainQuantities, setPlainQuantities] = useState<SizeQuantities>(emptyQuantities());

  const [printedProduct, setPrintedProduct] = useState("");
  const [printedQuantities, setPrintedQuantities] = useState<SizeQuantities>(emptyQuantities());

  const [pumaQuantities, setPumaQuantities] = useState<SizeQuantities>(emptyQuantities());
  const [entries, setEntries] = useState<StoredStockEntry[]>([]);

  // Desktop only — which of the 3 fixed categories is active in the single
  // "Select Product" dropdown. Mobile doesn't use this (it has 3 separate
  // expandable sections instead), so it stays unaffected either way.
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | "">("");

  useEffect(() => {
    const stored = window.localStorage.getItem(STOCK_LOG_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as StoredStockEntry[];
      setEntries(Array.isArray(parsed) ? parsed : []);
    } catch {
      setEntries([]);
    }
  }, []);

  const saveEntries = (next: StoredStockEntry[]) => {
    setEntries(next);
    window.localStorage.setItem(STOCK_LOG_KEY, JSON.stringify(next));
    notifyInventorySync();
  };

  const clearDraft = () => {
    window.localStorage.removeItem(STOCK_DRAFT_KEY);
    notifyInventorySync();
  };

  const updateQuantity = (category: CategoryKey, size: SizeName, value: number) => {
    const clean = String(Math.max(0, Math.floor(value)));
    if (category === "plain") {
      setPlainQuantities((current) => ({ ...current, [size]: clean }));
      return;
    }
    if (category === "printed") {
      setPrintedQuantities((current) => ({ ...current, [size]: clean }));
      return;
    }
    setPumaQuantities((current) => ({ ...current, [size]: clean }));
  };

  const increaseQuantity = (category: CategoryKey, size: SizeName, currentValue: string) => {
    updateQuantity(category, size, quantityToNumber(currentValue) + 1);
  };

  const decreaseQuantity = (category: CategoryKey, size: SizeName, currentValue: string) => {
    updateQuantity(category, size, Math.max(0, quantityToNumber(currentValue) - 1));
  };


  const buildLogEntries = (): StoredStockEntry[] => {
    const now = new Date().toISOString();
    const created: StoredStockEntry[] = [];
    for (const size of sizeOrder) {
      const qty = quantityToNumber(plainQuantities[size]);
      if (qty > 0) created.push({ id: crypto.randomUUID(), category: "Plain T-Shirts", productName: "Plain T-Shirts", size, quantity: qty, createdAt: now });
    }
    if (printedProduct) {
      for (const size of sizeOrder) {
        const qty = quantityToNumber(printedQuantities[size]);
        if (qty > 0) created.push({ id: crypto.randomUUID(), category: "Printed T-Shirts", productName: printedProduct, size, quantity: qty, createdAt: now });
      }
    }
    for (const size of sizeOrder) {
      const qty = quantityToNumber(pumaQuantities[size]);
      if (qty > 0) created.push({ id: crypto.randomUUID(), category: "Puma T-Shirts", productName: "Puma", size, quantity: qty, createdAt: now });
    }
    return created;
  };

  const resetForm = () => {
    setPrintedProduct("");
    setPlainQuantities(emptyQuantities());
    setPrintedQuantities(emptyQuantities());
    setPumaQuantities(emptyQuantities());
    setExpanded({ plain: false, printed: false, puma: false });
    setSelectedCategory("");
    clearDraft();
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const logs = buildLogEntries();
      if (!logs.length) throw new Error("Enter at least one quantity greater than 0.");

      // Keep localStorage in sync for the Inventory page
      saveEntries([...logs, ...entries]);

      // Persist to Supabase — auto-creates brand/product/size if missing
      const stockUpItems: StockUpEntry[] = logs.map((log) => ({
        brandName: log.productName,
        categoryName: CATEGORY_MAP[log.category.toLowerCase()] ?? log.category,
        size: log.size,
        quantity: log.quantity,
      }));
      return stockUpToSupabase(stockUpItems);
    },
    onSuccess: async () => {
      toast.success("Stock saved and synced to inventory.");
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["inventory-by-brand"] });
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["product-sizes"] });
      notifyInventorySync();
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error, "Could not save stock entry.");
      toast.error(message);
    },
  });

  const renderSizeInputs = (category: CategoryKey, quantities: SizeQuantities) => (
    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {sizeOrder.map((size) => (
        <div key={size} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/70">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{size}</label>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900">
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white p-3 text-slate-700 transition hover:border-blue-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              onClick={() => decreaseQuantity(category, size, quantities[size])}
              aria-label={`Decrease ${size} quantity`}
            >
              -
            </button>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={quantityToNumber(quantities[size])}
              onChange={(event) => {
                const digitsOnly = event.target.value.replace(/\D/g, "");
                updateQuantity(category, size, digitsOnly === "" ? 0 : parseInt(digitsOnly, 10));
              }}
              onFocus={(event) => event.target.select()}
              aria-label={`${size} quantity`}
              className="h-11 w-16 shrink-0 rounded-lg border border-slate-300 bg-white text-center text-sm font-bold text-slate-900 outline-none focus:border-blue-400 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
            />
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white p-3 text-slate-700 transition hover:border-blue-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              onClick={() => increaseQuantity(category, size, quantities[size])}
              aria-label={`Increase ${size} quantity`}
            >
              +
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
    <div className="space-y-4 lg:hidden">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Stock Up</h1>
        <p className="text-sm text-slate-500">Add stock by category with size-wise quantities in a mobile-first flow.</p>
      </div>

      <Card className="rounded-3xl border-blue-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-4">
          <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              className="flex w-full items-center justify-between bg-slate-50 px-3 py-3 text-left dark:bg-slate-900"
              onClick={() => setExpanded((current) => ({ ...current, plain: !current.plain }))}
            >
              <span className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                <Shirt className="h-4 w-4 text-blue-600" /> Plain T-Shirts
              </span>
              <ChevronDown className={`h-4 w-4 text-slate-500 transition ${expanded.plain ? "rotate-180" : ""}`} />
            </button>

            <div className={`transition-all duration-300 ${expanded.plain ? "max-h-[640px] p-3 opacity-100" : "max-h-0 p-0 opacity-0"}`}>
              {renderSizeInputs("plain", plainQuantities)}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              className="flex w-full items-center justify-between bg-slate-50 px-3 py-3 text-left dark:bg-slate-900"
              onClick={() => setExpanded((current) => ({ ...current, printed: !current.printed }))}
            >
              <span className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                <Shirt className="h-4 w-4 text-blue-600" /> Printed T-Shirts
              </span>
              <ChevronDown className={`h-4 w-4 text-slate-500 transition ${expanded.printed ? "rotate-180" : ""}`} />
            </button>

            <div className={`transition-all duration-300 ${expanded.printed ? "max-h-[760px] p-3 opacity-100" : "max-h-0 p-0 opacity-0"}`}>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Select Product</label>
              <Select value={printedProduct} onChange={(event) => setPrintedProduct(event.target.value)}>
                <option value="">Choose printed product</option>
                {printedProducts.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>

              {printedProduct ? renderSizeInputs("printed", printedQuantities) : null}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              className="flex w-full items-center justify-between bg-slate-50 px-3 py-3 text-left dark:bg-slate-900"
              onClick={() => setExpanded((current) => ({ ...current, puma: !current.puma }))}
            >
              <span className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                <Shirt className="h-4 w-4 text-blue-600" /> Puma T-Shirts
              </span>
              <ChevronDown className={`h-4 w-4 text-slate-500 transition ${expanded.puma ? "rotate-180" : ""}`} />
            </button>

            <div className={`transition-all duration-300 ${expanded.puma ? "max-h-[640px] p-3 opacity-100" : "max-h-0 p-0 opacity-0"}`}>
              {renderSizeInputs("puma", pumaQuantities)}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-2">
            <Button
              type="button"
              className="h-11 rounded-2xl bg-blue-600 text-white hover:bg-blue-700"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              Save Stock
            </Button>
          </div>

          {!printedProduct ? (
            <p className="text-xs text-slate-500">Tip: Choose a Printed T-Shirt product to reveal size-wise quantity fields.</p>
          ) : null}
        </div>
      </Card>
    </div>

    {/* ── Desktop only — dynamic product list from Management ─────────────*/}
    <div className="hidden space-y-4 lg:block">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">Stock Up</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Select a product and log size-wise quantities received.</p>
      </div>

      <Card className="rounded-3xl border-blue-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Select Product</label>
            <div className="relative">
              <Select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value as CategoryKey | "")}
              >
                <option value="">Choose a product</option>
                <option value="plain">Plain</option>
                <option value="printed">Printed</option>
                <option value="puma">Puma</option>
              </Select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
          </div>

          {selectedCategory === "printed" ? (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Select Printed Product</label>
              <Select value={printedProduct} onChange={(event) => setPrintedProduct(event.target.value)}>
                <option value="">Choose printed product</option>
                {printedProducts.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          {selectedCategory === "plain" ? renderSizeInputs("plain", plainQuantities) : null}
          {selectedCategory === "printed" && printedProduct ? renderSizeInputs("printed", printedQuantities) : null}
          {selectedCategory === "puma" ? renderSizeInputs("puma", pumaQuantities) : null}

          <Button
            type="button"
            className="h-11 rounded-2xl bg-blue-600 text-white hover:bg-blue-700"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Save Stock
          </Button>
        </div>
      </Card>
    </div>
    </>
  );
}
