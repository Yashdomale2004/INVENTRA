import { supabase } from "../lib/supabase";
import type { OrderStatus, RequirementCombination, StatusHistoryEntry } from "../lib/orderStorage";

export type EnquiryRecord = {
  id: string;
  orderId: string;
  customerName: string;
  assignerName: string;
  customRequirement: string;
  combinations: RequirementCombination[];
  shippingImage: string;
  trackingNumber: string;
  orderStatus: OrderStatus;
  statusHistory: StatusHistoryEntry[];
  deliveryDate: string | null;
  notes: string;
  createdAt: string;
  hidden: boolean;
};

export type EnquiryFormPayload = {
  customerName: string;
  assignerName: string;
  customRequirement: string;
  combinations: RequirementCombination[];
  trackingNumber: string;
  orderStatus: OrderStatus;
  statusHistory: StatusHistoryEntry[];
  deliveryDate: string | null;
  notes: string;
};

const SELECT_COLUMNS =
  "id, order_id, customer_name, assigner_name, custom_requirement, combinations, shipping_image_url, tracking_number, order_status, status_history, delivery_date, notes, created_at, hidden";

function logSupabaseError(context: string, error: unknown) {
  console.error(`[enquiries:${context}]`, error);
}

async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    const authError = error ?? new Error("User not authenticated");
    logSupabaseError("getCurrentUserId", authError);
    throw authError;
  }

  return user.id;
}

function mapRow(row: any): EnquiryRecord {
  return {
    id: row.id,
    orderId: row.order_id,
    customerName: row.customer_name,
    assignerName: row.assigner_name,
    customRequirement: row.custom_requirement ?? "",
    combinations: row.combinations ?? [],
    shippingImage: row.shipping_image_url ?? "",
    trackingNumber: row.tracking_number ?? "",
    orderStatus: row.order_status as OrderStatus,
    statusHistory: row.status_history ?? [],
    deliveryDate: row.delivery_date,
    notes: row.notes ?? "",
    createdAt: row.created_at,
    hidden: row.hidden ?? false,
  };
}

export async function fetchEnquiries(): Promise<EnquiryRecord[]> {
  const { data, error } = await supabase
    .from("enquiries")
    .select(SELECT_COLUMNS)
    .eq("hidden", false)
    .order("created_at", { ascending: false });

  if (error) {
    logSupabaseError("fetchEnquiries", error);
    throw error;
  }
  return (data ?? []).map(mapRow);
}

export async function fetchPendingEnquiries(): Promise<EnquiryRecord[]> {
  const { data, error } = await supabase
    .from("enquiries")
    .select(SELECT_COLUMNS)
    .neq("order_status", "Received")
    .eq("hidden", false);

  if (error) {
    logSupabaseError("fetchPendingEnquiries", error);
    throw error;
  }
  return (data ?? []).map(mapRow);
}

export async function hideEnquiry(id: string): Promise<void> {
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from("enquiries")
    .update({ hidden: true, updated_by: userId })
    .eq("id", id);

  if (error) {
    logSupabaseError("hideEnquiry", error);
    throw error;
  }
}

export async function createEnquiry(payload: EnquiryFormPayload, imageFile: File | null): Promise<EnquiryRecord> {
  const userId = await getCurrentUserId();

  let shippingImageUrl: string | null = null;
  if (imageFile) {
    const filePath = `${userId}/${crypto.randomUUID()}-${imageFile.name}`;
    const { error: uploadError } = await supabase.storage.from("enquiry-images").upload(filePath, imageFile);
    if (uploadError) {
      logSupabaseError("createEnquiry:upload", uploadError);
      throw uploadError;
    }
    const { data: publicData } = supabase.storage.from("enquiry-images").getPublicUrl(filePath);
    shippingImageUrl = publicData.publicUrl;
  }

  const insertPayload = {
    created_by: userId,
    updated_by: userId,
    customer_name: payload.customerName,
    assigner_name: payload.assignerName,
    custom_requirement: payload.customRequirement,
    combinations: payload.combinations,
    shipping_image_url: shippingImageUrl,
    tracking_number: payload.trackingNumber,
    order_status: payload.orderStatus,
    status_history: payload.statusHistory,
    delivery_date: payload.deliveryDate,
    notes: payload.notes,
  };

  const { data, error } = await supabase.from("enquiries").insert(insertPayload).select(SELECT_COLUMNS).single();
  if (error) {
    logSupabaseError("createEnquiry:insert", { error, insertPayload });
    throw error;
  }
  return mapRow(data);
}

export async function updateEnquiryStatus(
  id: string,
  patch: { orderStatus: OrderStatus; statusHistory: StatusHistoryEntry[]; deliveryDate: string | null }
): Promise<EnquiryRecord> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("enquiries")
    .update({
      order_status: patch.orderStatus,
      status_history: patch.statusHistory,
      delivery_date: patch.deliveryDate,
      updated_by: userId,
    })
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    logSupabaseError("updateEnquiryStatus", error);
    throw error;
  }
  return mapRow(data);
}

export type EnquiryUpdatePayload = {
  customerName: string;
  customRequirement: string;
  combinations: RequirementCombination[];
  trackingNumber: string;
  orderStatus: OrderStatus;
  statusHistory: StatusHistoryEntry[];
  deliveryDate: string | null;
  notes: string;
};

export async function updateEnquiry(id: string, patch: EnquiryUpdatePayload): Promise<EnquiryRecord> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("enquiries")
    .update({
      customer_name: patch.customerName,
      custom_requirement: patch.customRequirement,
      combinations: patch.combinations,
      tracking_number: patch.trackingNumber,
      order_status: patch.orderStatus,
      status_history: patch.statusHistory,
      delivery_date: patch.deliveryDate,
      notes: patch.notes,
      updated_by: userId,
    })
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    logSupabaseError("updateEnquiry", error);
    throw error;
  }
  return mapRow(data);
}

export async function findEnquiryByTrackingNumber(trackingNumber: string): Promise<EnquiryRecord | null> {
  const { data, error } = await supabase
    .from("enquiries")
    .select(SELECT_COLUMNS)
    .eq("tracking_number", trackingNumber)
    .maybeSingle();

  if (error) {
    logSupabaseError("findEnquiryByTrackingNumber", error);
    throw error;
  }
  return data ? mapRow(data) : null;
}

export async function updateEnquiryByTrackingNumber(
  trackingNumber: string,
  patch: { orderStatus: OrderStatus; statusHistory: StatusHistoryEntry[]; deliveryDate: string | null }
): Promise<EnquiryRecord | null> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("enquiries")
    .update({
      order_status: patch.orderStatus,
      status_history: patch.statusHistory,
      delivery_date: patch.deliveryDate,
      updated_by: userId,
    })
    .eq("tracking_number", trackingNumber)
    .select(SELECT_COLUMNS)
    .maybeSingle();

  if (error) {
    logSupabaseError("updateEnquiryByTrackingNumber", error);
    throw error;
  }
  return data ? mapRow(data) : null;
}
