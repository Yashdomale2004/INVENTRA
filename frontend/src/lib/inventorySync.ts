import { fetchPendingEnquiries } from "../services/enquiries";

type SizeName = "S" | "M" | "L" | "XL";

type SizeStock = Record<SizeName, number>;

type StockLogEntry = {
  id: string;
  category: string;
  productName: string;
  size: SizeName;
  quantity: number;
  createdAt: string;
};

export const STOCK_LOG_KEY = "inventra_stock_up_entries";
export const STOCK_DRAFT_KEY = "inventra_stock_up_draft";
export const INVENTORY_SYNC_EVENT = "inventra:inventory-sync";

export type InventorySnapshot = {
  /** Available stock after deducting active enquiry quantities. */
  plain: SizeStock;
  printed: {
    "Ceramic Shield": SizeStock;
    Sunkool: SizeStock;
    RS: SizeStock;
  };
  puma: SizeStock;
  /** Raw stock added via Stock Up, before any enquiry deductions. */
  rawPlain: SizeStock;
  rawPrinted: {
    "Ceramic Shield": SizeStock;
    Sunkool: SizeStock;
    RS: SizeStock;
  };
  rawPuma: SizeStock;
  totals: {
    plain: number;
    printed: number;
    puma: number;
    overall: number;
  };
  rawTotals: {
    plain: number;
    printed: number;
    puma: number;
    overall: number;
  };
};

function emptySizeStock(): SizeStock {
  return { S: 0, M: 0, L: 0, XL: 0 };
}

function toSafeQuantity(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
}

function parseJsonArray<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function normalizePrintedName(name: string): "Ceramic Shield" | "Sunkool" | "RS" | null {
  const value = name.trim().toLowerCase();
  if (value === "ceramic shield") return "Ceramic Shield";
  if (value === "sunkool") return "Sunkool";
  if (value === "rs" || value === "r s") return "RS";
  return null;
}

export function sumSizeStock(stock: SizeStock): number {
  return stock.S + stock.M + stock.L + stock.XL;
}

function addSizeStock(target: SizeStock, size: string, qty: number) {
  if (size === "S" || size === "M" || size === "L" || size === "XL") {
    target[size] += qty;
  }
}

export function notifyInventorySync() {
  window.dispatchEvent(new CustomEvent(INVENTORY_SYNC_EVENT));
}

export async function calculateInventorySnapshot(): Promise<InventorySnapshot> {
  const stockEntries = parseJsonArray<StockLogEntry>(window.localStorage.getItem(STOCK_LOG_KEY));
  const draftEntries = parseJsonArray<StockLogEntry>(window.localStorage.getItem(STOCK_DRAFT_KEY));
  // Silently fall back to no deductions if Supabase is unavailable
  const enquiries = await fetchPendingEnquiries().catch((err) => {
    console.warn("[inventorySync] fetchPendingEnquiries failed, skipping enquiry deductions", err);
    return [];
  });

  const plain = emptySizeStock();

  const allEntries = [...stockEntries, ...draftEntries];
  const printed = {
    "Ceramic Shield": emptySizeStock(),
    Sunkool: emptySizeStock(),
    RS: emptySizeStock(),
  };
  const puma = emptySizeStock();

  for (const entry of allEntries) {
    const qty = toSafeQuantity(entry.quantity);
    if (qty <= 0) continue;

    if (entry.category === "Plain T-Shirts") {
      addSizeStock(plain, entry.size, qty);
      continue;
    }

    if (entry.category === "Printed T-Shirts") {
      const product = normalizePrintedName(entry.productName);
      if (product) {
        addSizeStock(printed[product], entry.size, qty);
      }
      continue;
    }

    if (entry.category === "Puma T-Shirts") {
      addSizeStock(puma, entry.size, qty);
    }
  }

  const plainRaw = { ...plain };
  const printedRaw = {
    "Ceramic Shield": { ...printed["Ceramic Shield"] },
    Sunkool: { ...printed.Sunkool },
    RS: { ...printed.RS },
  };
  const pumaRaw = { ...puma };

  // Treat active enquiries as reserved quantities deducted from available stock.
  for (const enquiry of enquiries) {
    for (const combination of enquiry.combinations ?? []) {
      if (!combination.brand) continue;

      if (combination.brand === "Puma") {
        for (const size of ["S", "M", "L", "XL"] as const) {
          puma[size] = Math.max(0, puma[size] - toSafeQuantity(combination.quantities?.[size]));
        }
        continue;
      }

      const printedProduct = normalizePrintedName(combination.brand);
      if (printedProduct) {
        for (const size of ["S", "M", "L", "XL"] as const) {
          printed[printedProduct][size] = Math.max(
            0,
            printed[printedProduct][size] - toSafeQuantity(combination.quantities?.[size])
          );
        }
      }
    }
  }

  const plainTotal = sumSizeStock(plain);
  const printedTotal =
    sumSizeStock(printed["Ceramic Shield"]) +
    sumSizeStock(printed.Sunkool) +
    sumSizeStock(printed.RS);
  const pumaTotal = sumSizeStock(puma);

  const plainRawTotal = sumSizeStock(plainRaw);
  const printedRawTotal =
    sumSizeStock(printedRaw["Ceramic Shield"]) +
    sumSizeStock(printedRaw.Sunkool) +
    sumSizeStock(printedRaw.RS);
  const pumaRawTotal = sumSizeStock(pumaRaw);

  return {
    plain,
    printed,
    puma,
    rawPlain: plainRaw,
    rawPrinted: printedRaw,
    rawPuma: pumaRaw,
    totals: {
      plain: plainTotal,
      printed: printedTotal,
      puma: pumaTotal,
      overall: plainTotal + printedTotal + pumaTotal,
    },
    rawTotals: {
      plain: plainRawTotal,
      printed: printedRawTotal,
      puma: pumaRawTotal,
      overall: plainRawTotal + printedRawTotal + pumaRawTotal,
    },
  };
}
