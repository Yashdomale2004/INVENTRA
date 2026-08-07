import { startOfDay } from "date-fns";

import { supabase } from "../lib/supabase";
import type { DashboardStats } from "../types";

export async function fetchDashboardStats() {
  const today = startOfDay(new Date()).toISOString();

  const [
    productsRes,
    distributorsRes,
    suppliersRes,
    sizesRes,
    todayReceiptRes,
    todayAllocationRes,
    notificationsRes,
    parcelsRes,
    recentReceiptsRes,
    recentAllocationsRes,
  ] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("distributors").select("id", { count: "exact", head: true }),
    supabase.from("suppliers").select("id", { count: "exact", head: true }),
    supabase.from("product_sizes").select("id,current_stock,minimum_stock,maximum_stock,purchase_price"),
    supabase
      .from("stock_entries")
      .select("quantity")
      .eq("transaction_type", "stock_in")
      .gte("received_date", today),
    supabase
      .from("stock_entries")
      .select("quantity")
      .eq("transaction_type", "stock_out")
      .gte("received_date", today),
    supabase.from("notifications").select("id,title,message,notification_type,is_read,created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("parcels").select("id,parcel_id,tracking_number,current_status,current_location,updated_at").order("updated_at", { ascending: false }).limit(5),
    supabase
      .from("stock_entries")
      .select(
        `id,quantity,color,received_date,notes,products:product_id(name),product_sizes:product_size_id(size),distributors:distributor_id(company_name,distributor_name),suppliers:supplier_id(supplier_name)`
      )
      .eq("transaction_type", "stock_in")
      .order("received_date", { ascending: false })
      .limit(5),
    supabase
      .from("stock_entries")
      .select(
        `id,quantity,color,received_date,notes,allocated_to,allocated_to_type,products:product_id(name),product_sizes:product_size_id(size)`
      )
      .eq("transaction_type", "stock_out")
      .order("received_date", { ascending: false })
      .limit(5),
  ]);

  if (sizesRes.error) throw sizesRes.error;
  if (todayReceiptRes.error) throw todayReceiptRes.error;
  if (todayAllocationRes.error) throw todayAllocationRes.error;
  if (notificationsRes.error) throw notificationsRes.error;
  if (parcelsRes.error) throw parcelsRes.error;
  if (recentReceiptsRes.error) throw recentReceiptsRes.error;
  if (recentAllocationsRes.error) throw recentAllocationsRes.error;

  const sizes = sizesRes.data ?? [];
  const todayReceived = (todayReceiptRes.data ?? []).reduce((acc, item) => acc + Number(item.quantity ?? 0), 0);
  const todayAllocated = (todayAllocationRes.data ?? []).reduce((acc, item) => acc + Number(item.quantity ?? 0), 0);

  const currentStock = sizes.reduce((acc, item) => acc + Number(item.current_stock ?? 0), 0);
  const inventoryValue = sizes.reduce((acc, item) => acc + Number(item.current_stock ?? 0) * Number(item.purchase_price ?? 0), 0);
  const lowStock = sizes.filter((item) => Number(item.current_stock ?? 0) <= Number(item.minimum_stock ?? 0)).length;
  const outOfStock = sizes.filter((item) => Number(item.current_stock ?? 0) <= 0).length;

  const recentStockReceived = (recentReceiptsRes.data ?? []).map((item: any) => ({
    id: item.id,
    product_name: item.products?.name ?? "Unknown",
    product_size_name: item.product_sizes?.size ?? "-",
    color: item.color ?? "-",
    quantity: Number(item.quantity ?? 0),
    transaction_date: item.received_date,
    source_name: item.distributors ? `${item.distributors.company_name} - ${item.distributors.distributor_name}` : item.suppliers?.supplier_name ?? "N/A",
    notes: item.notes ?? "",
  }));

  const recentAllocations = (recentAllocationsRes.data ?? []).map((item: any) => ({
    id: item.id,
    product_name: item.products?.name ?? "Unknown",
    product_size_name: item.product_sizes?.size ?? "-",
    color: item.color ?? "-",
    quantity: Number(item.quantity ?? 0),
    transaction_date: item.received_date,
    allocated_to: item.allocated_to ?? "N/A",
    allocated_to_type: item.allocated_to_type ?? "person",
    notes: item.notes ?? "",
  }));

  return {
    total_products: productsRes.count ?? 0,
    total_distributors: distributorsRes.count ?? 0,
    total_suppliers: suppliersRes.count ?? 0,
    inventory_value: inventoryValue,
    total_stock: currentStock,
    today_received: todayReceived,
    today_allocated: todayAllocated,
    low_stock: lowStock,
    out_of_stock: outOfStock,
    recent_stock_received: recentStockReceived,
    recent_allocations: recentAllocations,
    recent_parcels: parcelsRes.data ?? [],
    recent_notifications: notificationsRes.data ?? [],
  } satisfies DashboardStats;
}

export async function fetchAllocationList() {
  return [];
}

export async function fetchStockTransactions() {
  const { data, error } = await supabase
    .from("stock_entries")
    .select("*")
    .order("received_date", { ascending: false });

  if (error) throw error;
  return data;
}
