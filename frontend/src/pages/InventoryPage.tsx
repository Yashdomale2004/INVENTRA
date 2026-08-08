import { ChevronDown, Layers, Package } from "lucide-react";
import { useEffect, useState } from "react";

import { Card } from "../components/ui/card";
import { INVENTORY_SYNC_EVENT, calculateInventorySnapshot, type InventorySnapshot } from "../lib/inventorySync";

const sizeOrder = ["S", "M", "L", "XL", "XXL"] as const;

type ExpandState = {
  plain: boolean;
  printed: boolean;
  puma: boolean;
  ceramic: boolean;
  sunkool: boolean;
  rs: boolean;
};

function SizeRows({ values }: { values: Record<"S" | "M" | "L" | "XL" | "XXL", number> }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {sizeOrder.map((size) => (
        <div key={size} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/70">
          <p className="text-xs uppercase tracking-wide text-slate-500">{size}</p>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{values[size]}</p>
        </div>
      ))}
    </div>
  );
}

const emptySnapshot: InventorySnapshot = {
  plain: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
  printed: {
    "Ceramic Shield": { S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
    Sunkool: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
    RS: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
  },
  puma: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
  rawPlain: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
  rawPrinted: {
    "Ceramic Shield": { S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
    Sunkool: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
    RS: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
  },
  rawPuma: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
  totals: { plain: 0, printed: 0, puma: 0, overall: 0 },
  rawTotals: { plain: 0, printed: 0, puma: 0, overall: 0 },
};

export function InventoryPage() {
  const [snapshot, setSnapshot] = useState<InventorySnapshot>(emptySnapshot);
  const [expanded, setExpanded] = useState<ExpandState>({
    plain: true,
    printed: true,
    puma: true,
    ceramic: true,
    sunkool: true,
    rs: true,
  });

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      calculateInventorySnapshot().then((data) => {
        if (!cancelled) setSnapshot(data);
      });
    };

    refresh();
    window.addEventListener(INVENTORY_SYNC_EVENT, refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);

    return () => {
      cancelled = true;
      window.removeEventListener(INVENTORY_SYNC_EVENT, refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Inventory</h1>
        <p className="text-sm text-slate-500">Auto-synced live stock from Stock Up and assigned enquiry quantities.</p>
      </div>

      <section className="grid grid-cols-2 gap-3">
        <Card className="rounded-3xl border-blue-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500">Overall Stock</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{snapshot.totals.overall}</p>
        </Card>
        <Card className="rounded-3xl border-blue-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500">Printed Total</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{snapshot.totals.printed}</p>
        </Card>
      </section>

      <Card className="rounded-3xl border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          className="flex w-full items-center justify-between"
          onClick={() => setExpanded((current) => ({ ...current, plain: !current.plain }))}
        >
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Plain T-Shirts</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{snapshot.totals.plain}</span>
            <ChevronDown className={`h-4 w-4 text-slate-500 transition ${expanded.plain ? "rotate-180" : ""}`} />
          </div>
        </button>
        {expanded.plain ? <div className="mt-3"><SizeRows values={snapshot.plain} /></div> : null}
      </Card>

      <Card className="rounded-3xl border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          className="flex w-full items-center justify-between"
          onClick={() => setExpanded((current) => ({ ...current, printed: !current.printed }))}
        >
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Printed T-Shirts</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{snapshot.totals.printed}</span>
            <ChevronDown className={`h-4 w-4 text-slate-500 transition ${expanded.printed ? "rotate-180" : ""}`} />
          </div>
        </button>

        {expanded.printed ? (
          <div className="mt-3 space-y-3">
            <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
              <button
                type="button"
                className="mb-2 flex w-full items-center justify-between"
                onClick={() => setExpanded((current) => ({ ...current, ceramic: !current.ceramic }))}
              >
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Ceramic Shield</p>
                <ChevronDown className={`h-4 w-4 text-slate-500 transition ${expanded.ceramic ? "rotate-180" : ""}`} />
              </button>
              {expanded.ceramic ? <SizeRows values={snapshot.printed["Ceramic Shield"]} /> : null}
            </div>

            <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
              <button
                type="button"
                className="mb-2 flex w-full items-center justify-between"
                onClick={() => setExpanded((current) => ({ ...current, sunkool: !current.sunkool }))}
              >
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Sunkool</p>
                <ChevronDown className={`h-4 w-4 text-slate-500 transition ${expanded.sunkool ? "rotate-180" : ""}`} />
              </button>
              {expanded.sunkool ? <SizeRows values={snapshot.printed.Sunkool} /> : null}
            </div>

            <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
              <button
                type="button"
                className="mb-2 flex w-full items-center justify-between"
                onClick={() => setExpanded((current) => ({ ...current, rs: !current.rs }))}
              >
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">RS</p>
                <ChevronDown className={`h-4 w-4 text-slate-500 transition ${expanded.rs ? "rotate-180" : ""}`} />
              </button>
              {expanded.rs ? <SizeRows values={snapshot.printed.RS} /> : null}
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="rounded-3xl border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          className="flex w-full items-center justify-between"
          onClick={() => setExpanded((current) => ({ ...current, puma: !current.puma }))}
        >
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Puma</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{snapshot.totals.puma}</span>
            <ChevronDown className={`h-4 w-4 text-slate-500 transition ${expanded.puma ? "rotate-180" : ""}`} />
          </div>
        </button>
        {expanded.puma ? <div className="mt-3"><SizeRows values={snapshot.puma} /></div> : null}
      </Card>
    </div>
  );
}
