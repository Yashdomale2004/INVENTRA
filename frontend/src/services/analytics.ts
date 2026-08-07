import { startOfDay, startOfMonth, subMonths } from "date-fns";

import { supabase } from "../lib/supabase";
import type { AnalyticsOverview } from "../types";

export async function fetchAnalyticsOverview() {
  const today = new Date();
  const dayStart = startOfDay(today).toISOString();
  const monthStart = startOfMonth(today).toISOString();
  const prevMonthStart = startOfMonth(subMonths(today, 1)).toISOString();

  const [
    allocationsDayRes,
    allocationsMonthRes,
    allocationsYearRes,
    sizesRes,
    stockEntriesRes,
    parcelsRes,
    productsRes,
  ] = await Promise.all([
    supabase.from("stock_entries").select("quantity,purchase_cost,received_date").eq("transaction_type", "stock_out").gte("received_date", dayStart),
    supabase.from("stock_entries").select("quantity,purchase_cost,received_date").eq("transaction_type", "stock_out").gte("received_date", monthStart),
    supabase.from("stock_entries").select("quantity,purchase_cost,received_date").eq("transaction_type", "stock_out"),
    supabase.from("product_sizes").select("current_stock,purchase_price"),
    supabase
      .from("stock_entries")
      .select("quantity,purchase_cost,received_date,distributor_id,distributors:distributor_id(distributor_name,company_name),product_id"),
    supabase.from("parcels").select("current_status"),
    supabase.from("products").select("id,name"),
  ]);

  if (allocationsDayRes.error) throw allocationsDayRes.error;
  if (allocationsMonthRes.error) throw allocationsMonthRes.error;
  if (allocationsYearRes.error) throw allocationsYearRes.error;
  if (sizesRes.error) throw sizesRes.error;
  if (stockEntriesRes.error) throw stockEntriesRes.error;
  if (parcelsRes.error) throw parcelsRes.error;
  if (productsRes.error) throw productsRes.error;

  const dailyAllocations = (allocationsDayRes.data ?? []).reduce((acc, row) => acc + Number(row.quantity ?? 0), 0);
  const monthlyAllocations = (allocationsMonthRes.data ?? []).reduce((acc, row) => acc + Number(row.quantity ?? 0), 0);
  const yearlyAllocations = (allocationsYearRes.data ?? []).reduce((acc, row) => {
    const date = new Date(row.received_date);
    if (date.getFullYear() !== today.getFullYear()) return acc;
    return acc + Number(row.quantity ?? 0);
  }, 0);

  const inventoryValue = (sizesRes.data ?? []).reduce((acc, row) => acc + Number(row.current_stock ?? 0) * Number(row.purchase_price ?? 0), 0);

  const productMap = new Map((productsRes.data ?? []).map((p) => [p.id, p.name]));
  const topProductsMap = new Map<string, number>();
  for (const row of stockEntriesRes.data ?? []) {
    const name = productMap.get((row as any).product_id) ?? "Unknown";
    topProductsMap.set(name, (topProductsMap.get(name) ?? 0) + Number(row.quantity ?? 0));
  }
  const topProducts = Array.from(topProductsMap.entries())
    .map(([name, quantity]) => ({ product__name: name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  const parcelStatusMap = new Map<string, number>();
  for (const row of parcelsRes.data ?? []) {
    const status = row.current_status ?? "unknown";
    parcelStatusMap.set(status, (parcelStatusMap.get(status) ?? 0) + 1);
  }
  const parcelStatus = Array.from(parcelStatusMap.entries()).map(([current_status, total]) => ({ current_status, total }));

  const pivotMap = new Map<string, any>();
  for (const row of stockEntriesRes.data ?? []) {
    const r: any = row;
    if (!r.distributor_id) continue;
    const key = r.distributor_id;
    const receivedDate = new Date(r.received_date);
    const monthBucket = receivedDate >= new Date(monthStart) ? "current" : receivedDate >= new Date(prevMonthStart) && receivedDate < new Date(monthStart) ? "previous" : "other";
    if (monthBucket === "other") continue;

    const base = pivotMap.get(key) ?? {
      distributor_id: key,
      distributor_name: r.distributors?.distributor_name ?? "Unknown",
      company_name: r.distributors?.company_name ?? "Unknown",
      current_month_qty: 0,
      previous_month_qty: 0,
      current_month_value: 0,
      previous_month_value: 0,
    };

    if (monthBucket === "current") {
      base.current_month_qty += Number(r.quantity ?? 0);
      base.current_month_value += Number(r.quantity ?? 0) * Number(r.purchase_cost ?? 0);
    } else {
      base.previous_month_qty += Number(r.quantity ?? 0);
      base.previous_month_value += Number(r.quantity ?? 0) * Number(r.purchase_cost ?? 0);
    }

    pivotMap.set(key, base);
  }

  const distributorReceiptPivot = Array.from(pivotMap.values()).sort(
    (a, b) => b.current_month_qty - a.current_month_qty || b.previous_month_qty - a.previous_month_qty
  );

  const recipientMap = new Map<string, { recipient_key: string; recipient_name: string; recipient_type: string; quantity: number }>();
  for (const row of allocationsYearRes.data ?? []) {
    const r: any = row;
    const recipientType = r.allocated_to_type ?? "person";
    const recipientName = r.allocated_to ?? "Unknown";
    const recipientKey = `${recipientType}:${recipientName}`;

    const base = recipientMap.get(recipientKey) ?? {
      recipient_key: recipientKey,
      recipient_name: recipientName,
      recipient_type: recipientType,
      quantity: 0,
    };

    base.quantity += Number(r.quantity ?? 0);
    recipientMap.set(recipientKey, base);
  }

  const allocationRecipientPivot = Array.from(recipientMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 6);

  return {
    daily_allocations: dailyAllocations,
    monthly_allocations: monthlyAllocations,
    yearly_allocations: yearlyAllocations,
    inventory_value: inventoryValue,
    top_products: topProducts,
    parcel_status: parcelStatus,
    distributor_receipt_pivot: distributorReceiptPivot,
    allocation_recipient_pivot: allocationRecipientPivot,
    pivot_window: {
      current_month_start: monthStart.slice(0, 10),
      previous_month_start: prevMonthStart.slice(0, 10),
      previous_month_end: monthStart.slice(0, 10),
    },
  } satisfies AnalyticsOverview;
}
