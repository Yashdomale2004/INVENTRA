export type SizeName = "S" | "M" | "L" | "XL";
export type SizeQuantities = Record<SizeName, number>;
export type BrandName = "Sunkool" | "Ceramic Shield" | "R S" | "Puma" | "Plain T-Shirts";

export type OrderStatus =
  | "New"
  | "Giving for Printing"
  | "In Printing"
  | "Yet to Pack"
  | "Dispatch"
  | "Received"
  | "Pending";

export type StatusHistoryEntry = {
  status: OrderStatus;
  updated_at: string;
};

export type RequirementCombination = {
  id: string;
  brand: "" | BrandName;
  quantities: SizeQuantities;
};

export const SELECTED_TRACKING_NUMBER_KEY = "inventra_selected_tracking_number";

export const ORDER_STATUSES: OrderStatus[] = [
  "New",
  "Pending",
  "Giving for Printing",
  "In Printing",
  "Yet to Pack",
  "Dispatch",
  "Received",
];

const ORDER_SUMMARY_STATUS_KEY = "inventra_order_summary_status";

export function loadOrderSummaryStatus(): OrderStatus | null {
  const raw = window.localStorage.getItem(ORDER_SUMMARY_STATUS_KEY);
  if (!raw) return null;
  return (ORDER_STATUSES.includes(raw as OrderStatus) ? (raw as OrderStatus) : null);
}

export function saveOrderSummaryStatus(status: OrderStatus) {
  window.localStorage.setItem(ORDER_SUMMARY_STATUS_KEY, status);
}

export function createEmptyCombination(): RequirementCombination {
  return {
    id: crypto.randomUUID(),
    brand: "",
    quantities: {
      S: 0,
      M: 0,
      L: 0,
      XL: 0,
    },
  };
}

export function getSelectedTrackingNumber(): string | null {
  return window.localStorage.getItem(SELECTED_TRACKING_NUMBER_KEY);
}

export function setSelectedTrackingNumber(trackingNumber: string) {
  window.localStorage.setItem(SELECTED_TRACKING_NUMBER_KEY, trackingNumber);
}
