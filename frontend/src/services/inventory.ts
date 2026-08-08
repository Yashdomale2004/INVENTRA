import { getCurrentUserId, supabase } from "../lib/supabase";
import type { Brand, Category, Distributor, Parcel, Product, ProductSize, StockTransaction, Supplier } from "../types";

export async function fetchProducts() {
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      category_id,
      brand_id,
      sku,
      barcode,
      qr_code,
      selling_price,
      purchase_price,
      gst,
      unit,
      description,
      status,
      minimum_stock,
      reorder_level,
      image_url,
      categories:category_id(name),
      brands:brand_id(name),
      product_sizes(id,product_id,size,current_stock,minimum_stock,maximum_stock,last_updated,purchase_price)
      `
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((item: any) => ({
    id: item.id,
    name: item.name,
    category: item.category_id,
    brand: item.brand_id,
    sku: item.sku,
    barcode: item.barcode,
    qr_code: item.qr_code,
    selling_price: String(item.selling_price ?? "0"),
    purchase_price: String(item.purchase_price ?? "0"),
    gst: String(item.gst ?? "0"),
    unit: item.unit,
    description: item.description ?? "",
    status: item.status,
    minimum_stock: item.minimum_stock ?? 0,
    reorder_level: item.reorder_level ?? 0,
    image: item.image_url,
    category_name: item.categories?.name,
    brand_name: item.brands?.name,
    sizes: (item.product_sizes ?? []).map((size: any) => ({
      id: size.id,
      product: size.product_id,
      size: size.size,
      current_stock: size.current_stock ?? 0,
      minimum_stock: size.minimum_stock ?? 0,
      maximum_stock: size.maximum_stock ?? 0,
      last_updated: size.last_updated,
      purchase_price: String(size.purchase_price ?? item.purchase_price ?? "0"),
    })),
  })) as Product[];
}

export async function createProduct(payload: FormData | Record<string, unknown>) {
  const userId = await getCurrentUserId();

  const input = payload instanceof FormData ? Object.fromEntries(payload.entries()) : payload;
  const sizes = typeof input.sizes === "string" ? (JSON.parse(input.sizes) as string[]) : [];
  const optionalText = (value: unknown) => {
    const text = typeof value === "string" ? value.trim() : "";
    return text.length ? text : null;
  };

  const insertPayload: Record<string, unknown> = {
    created_by: userId,
    updated_by: userId,
    name: input.name,
    category_id: input.category,
    brand_id: input.brand,
    sku: optionalText(input.sku),
    barcode: optionalText(input.barcode),
    qr_code: optionalText(input.qr_code),
    unit: input.unit,
    minimum_stock: Number(input.minimum_stock ?? 0),
    reorder_level: Number(input.minimum_stock ?? 0),
    purchase_price: Number(input.purchase_price ?? 0),
    selling_price: Number(input.selling_price ?? 0),
    gst: 0,
    description: input.description ?? "",
    status: input.status === "true" || input.status === true,
  };

  const { data: product, error } = await supabase.from("products").insert(insertPayload).select("*").single();
  if (error) throw error;

  if (payload instanceof FormData) {
    const image = payload.get("image");
    if (image instanceof File) {
      const filePath = `${userId}/${crypto.randomUUID()}-${image.name}`;
      const { error: uploadError } = await supabase.storage.from("product-images").upload(filePath, image);
      if (!uploadError) {
        const { data: publicData } = supabase.storage.from("product-images").getPublicUrl(filePath);
        await supabase.from("products").update({ image_url: publicData.publicUrl, updated_by: userId }).eq("id", product.id);
      }
    }
  }

  if (sizes.length) {
    const rows = sizes.map((size) => ({
      created_by: userId,
      updated_by: userId,
      product_id: product.id,
      size,
      current_stock: 0,
      minimum_stock: Number(input.minimum_stock ?? 0),
      maximum_stock: 0,
      purchase_price: Number(input.purchase_price ?? 0),
    }));

    const { error: sizeError } = await supabase.from("product_sizes").insert(rows);
    if (sizeError) throw sizeError;
  }

  return product;
}

export async function updateProduct(id: string, payload: FormData | Record<string, unknown>) {
  const userId = await getCurrentUserId();
  const input = payload instanceof FormData ? Object.fromEntries(payload.entries()) : payload;
  const optionalText = (value: unknown) => {
    const text = typeof value === "string" ? value.trim() : "";
    return text.length ? text : null;
  };

  const updatePayload: Record<string, unknown> = {
    updated_by: userId,
    name: input.name,
    category_id: input.category,
    brand_id: input.brand,
    sku: optionalText(input.sku),
    barcode: optionalText(input.barcode),
    qr_code: optionalText(input.qr_code),
    unit: input.unit,
    minimum_stock: Number(input.minimum_stock ?? 0),
    reorder_level: Number(input.minimum_stock ?? 0),
    purchase_price: Number(input.purchase_price ?? 0),
    selling_price: Number(input.selling_price ?? 0),
    description: input.description ?? "",
    status: input.status === "true" || input.status === true,
  };

  const { data, error } = await supabase.from("products").update(updatePayload).eq("id", id).select("*").single();
  if (error) throw error;

  return data;
}

export async function deleteProduct(id: string) {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString(), updated_by: userId, status: false })
    .eq("id", id);
  if (error) throw error;
  return { ok: true };
}

export async function fetchProductSizes() {
  const { data, error } = await supabase
    .from("product_sizes")
    .select("id,product_id,size,current_stock,minimum_stock,maximum_stock,last_updated,purchase_price")
    .order("size");

  if (error) throw error;

  return (data ?? []).map((item) => ({
    id: item.id,
    product: item.product_id,
    size: item.size,
    current_stock: item.current_stock,
    minimum_stock: item.minimum_stock,
    maximum_stock: item.maximum_stock,
    last_updated: item.last_updated,
    purchase_price: String(item.purchase_price ?? "0"),
  })) as ProductSize[];
}

export async function fetchDistributors() {
  const { data, error } = await supabase.from("distributors").select("*").is("deleted_at", null).order("company_name");
  if (error) throw error;
  return (data ?? []) as Distributor[];
}

export async function createDistributor(payload: Partial<Distributor>) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("distributors")
    .insert({ ...payload, created_by: userId, updated_by: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateDistributor(id: string, payload: Partial<Distributor>) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("distributors")
    .update({ ...payload, updated_by: userId })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDistributor(id: string) {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from("distributors")
    .update({ deleted_at: new Date().toISOString(), updated_by: userId, status: false })
    .eq("id", id);
  if (error) throw error;
  return { ok: true };
}

export async function fetchSuppliers() {
  const { data, error } = await supabase.from("suppliers").select("*").is("deleted_at", null).order("supplier_name");
  if (error) throw error;
  return (data ?? []) as Supplier[];
}

export async function createSupplier(payload: Partial<Supplier>) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("suppliers")
    .insert({ ...payload, created_by: userId, updated_by: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateSupplier(id: string, payload: Partial<Supplier>) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("suppliers")
    .update({ ...payload, updated_by: userId })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSupplier(id: string) {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from("suppliers")
    .update({ deleted_at: new Date().toISOString(), updated_by: userId, status: false })
    .eq("id", id);
  if (error) throw error;
  return { ok: true };
}

export async function fetchCategories() {
  const { data, error } = await supabase.from("categories").select("*").is("deleted_at", null).order("name");
  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function createCategory(payload: Partial<Category>) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("categories")
    .insert({ ...payload, created_by: userId, updated_by: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function fetchBrands() {
  const { data, error } = await supabase.from("brands").select("*").is("deleted_at", null).order("name");
  if (error) throw error;
  return (data ?? []) as Brand[];
}

export async function createBrand(payload: Partial<Brand>) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("brands")
    .insert({ ...payload, created_by: userId, updated_by: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function fetchStockTransactions() {
  const { data, error } = await supabase
    .from("stock_entries")
    .select(
      `
      id,
      product_id,
      product_size_id,
      transaction_type,
      quantity,
      purchase_cost,
      color,
      distributor_id,
      supplier_id,
      allocated_to,
      allocated_to_type,
      invoice_number,
      notes,
      received_date,
      products:product_id(name),
      product_sizes:product_size_id(size),
      distributors:distributor_id(distributor_name,company_name),
      suppliers:supplier_id(supplier_name)
      `
    )
    .order("received_date", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((item: any) => ({
    id: item.id,
    product: item.product_id,
    product_size: item.product_size_id,
    product_name: item.products?.name,
    product_size_name: item.product_sizes?.size,
    transaction_type: item.transaction_type,
    quantity: Number(item.quantity ?? 0),
    unit_cost: String(item.purchase_cost ?? 0),
    selling_price: "0",
    color: item.color ?? "",
    distributor: item.distributor_id,
    distributor_name: item.distributors ? `${item.distributors.company_name} - ${item.distributors.distributor_name}` : null,
    supplier: item.supplier_id,
    supplier_name: item.suppliers?.supplier_name ?? null,
    allocated_to: item.allocated_to ?? null,
    allocated_to_type: item.allocated_to_type ?? null,
    invoice_number: item.invoice_number ?? "",
    notes: item.notes ?? "",
    transaction_date: item.received_date,
  })) as StockTransaction[];
}

export async function fetchStockReceipts() {
  const { data, error } = await supabase
    .from("stock_entries")
    .select(
      `
      id,
      product_id,
      product_size_id,
      transaction_type,
      quantity,
      purchase_cost,
      color,
      distributor_id,
      supplier_id,
      allocated_to,
      allocated_to_type,
      invoice_number,
      notes,
      received_date,
      products:product_id(name),
      product_sizes:product_size_id(size),
      distributors:distributor_id(distributor_name,company_name),
      suppliers:supplier_id(supplier_name)
      `
    )
    .eq("transaction_type", "stock_in")
    .order("received_date", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((item: any) => ({
    id: item.id,
    product: item.product_id,
    product_size: item.product_size_id,
    product_name: item.products?.name,
    product_size_name: item.product_sizes?.size,
    transaction_type: item.transaction_type,
    quantity: Number(item.quantity ?? 0),
    unit_cost: String(item.purchase_cost ?? 0),
    selling_price: "0",
    color: item.color ?? "",
    distributor: item.distributor_id,
    distributor_name: item.distributors ? `${item.distributors.company_name} - ${item.distributors.distributor_name}` : null,
    supplier: item.supplier_id,
    supplier_name: item.suppliers?.supplier_name ?? null,
    allocated_to: item.allocated_to ?? null,
    allocated_to_type: item.allocated_to_type ?? null,
    invoice_number: item.invoice_number ?? "",
    notes: item.notes ?? "",
    transaction_date: item.received_date,
  })) as StockTransaction[];
}

export async function fetchAllocationHistory() {
  const { data, error } = await supabase
    .from("stock_entries")
    .select(
      `
      id,
      product_id,
      product_size_id,
      transaction_type,
      quantity,
      purchase_cost,
      color,
      distributor_id,
      supplier_id,
      allocated_to,
      allocated_to_type,
      invoice_number,
      notes,
      received_date,
      products:product_id(name),
      product_sizes:product_size_id(size),
      distributors:distributor_id(distributor_name,company_name),
      suppliers:supplier_id(supplier_name)
      `
    )
    .eq("transaction_type", "stock_out")
    .order("received_date", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((item: any) => ({
    id: item.id,
    product: item.product_id,
    product_size: item.product_size_id,
    product_name: item.products?.name,
    product_size_name: item.product_sizes?.size,
    transaction_type: item.transaction_type,
    quantity: Number(item.quantity ?? 0),
    unit_cost: String(item.purchase_cost ?? 0),
    selling_price: "0",
    color: item.color ?? "",
    distributor: item.distributor_id,
    distributor_name: item.distributors ? `${item.distributors.company_name} - ${item.distributors.distributor_name}` : null,
    supplier: item.supplier_id,
    supplier_name: item.suppliers?.supplier_name ?? null,
    allocated_to: item.allocated_to ?? null,
    allocated_to_type: item.allocated_to_type ?? null,
    invoice_number: item.invoice_number ?? "",
    notes: item.notes ?? "",
    transaction_date: item.received_date,
  })) as StockTransaction[];
}

export async function createStockTransaction(payload: {
  product: string;
  product_size: string;
  transaction_type: "stock_in";
  quantity: number;
  unit_cost: string;
  color: string;
  selling_price?: string;
  distributor: string | null;
  supplier: string | null;
  invoice_number: string;
  notes: string;
  transaction_date: string;
}) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("stock_entries")
    .insert({
      created_by: userId,
      product_id: payload.product,
      product_size_id: payload.product_size,
      distributor_id: payload.distributor,
      supplier_id: payload.supplier,
      color: payload.color,
      allocated_to: null,
      allocated_to_type: null,
      invoice_number: payload.invoice_number,
      quantity: payload.quantity,
      purchase_cost: Number(payload.unit_cost),
      transaction_type: payload.transaction_type,
      notes: payload.notes,
      received_date: payload.transaction_date,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/** Deducts enquiry quantities from product_sizes via stock_out entries. Returns brands+sizes skipped due to no matching product_size. */
export async function deductStockForEnquiry(
  combinations: Array<{ brand: string; quantities: Record<string, number> }>,
  orderId: string
): Promise<Array<{ brand: string; size: string; qty: number }>> {
  const userId = await getCurrentUserId();

  // Idempotency guard — skip if already deducted for this order
  const { data: existing } = await supabase
    .from("stock_entries")
    .select("id")
    .eq("invoice_number", `ENQ-${orderId}`)
    .limit(1);
  if (existing && existing.length > 0) return [];

  const brandNames = [...new Set(combinations.map((c) => c.brand).filter(Boolean))];
  if (!brandNames.length) return [];

  // Case-insensitive brand lookup using ilike OR filter
  const brandFilters = brandNames.map((n) => `name.ilike.${n}`).join(",");
  const { data: brandRows, error: brandsError } = await supabase
    .from("brands")
    .select("id,name")
    .or(brandFilters);
  if (brandsError) throw brandsError;

  const brandIdByName = new Map<string, string>();
  for (const b of brandRows ?? []) {
    brandIdByName.set(b.name.toLowerCase().trim(), b.id);
  }

  const allBrandIds = [...brandIdByName.values()];
  if (!allBrandIds.length) return combinations.flatMap((c) =>
    Object.entries(c.quantities)
      .filter(([, qty]) => qty > 0)
      .map(([size, qty]) => ({ brand: c.brand, size, qty }))
  );

  const { data: productRows, error: productsError } = await supabase
    .from("products")
    .select("id,brand_id")
    .in("brand_id", allBrandIds)
    .is("deleted_at", null);
  if (productsError) throw productsError;

  // brand_id -> product IDs
  const productsByBrand = new Map<string, string[]>();
  for (const p of productRows ?? []) {
    const list = productsByBrand.get(p.brand_id) ?? [];
    list.push(p.id);
    productsByBrand.set(p.brand_id, list);
  }

  const allProductIds = (productRows ?? []).map((p) => p.id);
  if (!allProductIds.length) return combinations.flatMap((c) =>
    Object.entries(c.quantities)
      .filter(([, qty]) => qty > 0)
      .map(([size, qty]) => ({ brand: c.brand, size, qty }))
  );

  const { data: sizeRows, error: sizesError } = await supabase
    .from("product_sizes")
    .select("id,product_id,size,current_stock")
    .in("product_id", allProductIds);
  if (sizesError) throw sizesError;

  // product_id -> size (lowercase) -> size row (prefer highest stock)
  const sizeRowMap = new Map<string, { id: string; product_id: string; current_stock: number }>();
  for (const row of sizeRows ?? []) {
    const key = `${row.product_id}::${row.size.toLowerCase().trim()}`;
    const existing = sizeRowMap.get(key);
    if (!existing || row.current_stock > existing.current_stock) {
      sizeRowMap.set(key, { id: row.id, product_id: row.product_id, current_stock: Number(row.current_stock ?? 0) });
    }
  }

  const stockOutEntries: Record<string, unknown>[] = [];
  const skipped: Array<{ brand: string; size: string; qty: number }> = [];

  for (const combo of combinations) {
    const brandId = brandIdByName.get(combo.brand.toLowerCase().trim());
    const productIds = brandId ? (productsByBrand.get(brandId) ?? []) : [];

    for (const [size, qty] of Object.entries(combo.quantities)) {
      if (!qty || qty <= 0) continue;

      // Match size case-insensitively; pick product_size with most stock
      let bestRow: { id: string; product_id: string; current_stock: number } | undefined;
      for (const pid of productIds) {
        const candidate = sizeRowMap.get(`${pid}::${size.toLowerCase().trim()}`);
        if (candidate && (!bestRow || candidate.current_stock > bestRow.current_stock)) {
          bestRow = candidate;
        }
      }

      if (!bestRow) {
        skipped.push({ brand: combo.brand, size, qty });
        continue;
      }

      // Never deduct more than available stock to prevent negatives
      const deductQty = Math.min(qty, Math.max(0, bestRow.current_stock));
      if (deductQty <= 0) {
        skipped.push({ brand: combo.brand, size, qty });
        continue;
      }

      stockOutEntries.push({
        created_by: userId,
        product_id: bestRow.product_id,
        product_size_id: bestRow.id,
        distributor_id: null,
        supplier_id: null,
        color: "N/A",
        allocated_to: null,
        allocated_to_type: null,
        invoice_number: `ENQ-${orderId}`,
        quantity: deductQty,
        purchase_cost: 0,
        transaction_type: "stock_out",
        notes: `Enquiry order ${orderId} — ${combo.brand} ${size}`,
        received_date: new Date().toISOString(),
      });
    }
  }

  if (stockOutEntries.length) {
    const { error } = await supabase.from("stock_entries").insert(stockOutEntries);
    if (error) throw error;
  }

  return skipped;
}

export type BrandSizeStock = {
  brandName: string;
  sizes: { size: string; stock: number }[];
  total: number;
};

export async function fetchInventoryByBrand(): Promise<BrandSizeStock[]> {
  const { data: productRows, error: productsError } = await supabase
    .from("products")
    .select("id, brands:brand_id(name)")
    .is("deleted_at", null);
  if (productsError) throw productsError;

  const brandByProduct = new Map<string, string>();
  for (const p of productRows ?? []) {
    const brandName = (p as any).brands?.name as string | undefined;
    if (brandName) brandByProduct.set(p.id, brandName);
  }
  if (!brandByProduct.size) return [];

  const { data: sizeRows, error: sizesError } = await supabase
    .from("product_sizes")
    .select("product_id, size, current_stock")
    .in("product_id", [...brandByProduct.keys()])
    .gt("current_stock", 0);
  if (sizesError) throw sizesError;

  // Aggregate stock per brand per size
  const byBrand = new Map<string, Map<string, number>>();
  for (const row of sizeRows ?? []) {
    const brandName = brandByProduct.get(row.product_id);
    if (!brandName) continue;
    if (!byBrand.has(brandName)) byBrand.set(brandName, new Map());
    const sizeMap = byBrand.get(brandName)!;
    sizeMap.set(row.size, (sizeMap.get(row.size) ?? 0) + Number(row.current_stock ?? 0));
  }

  const sizeOrder = ["S", "M", "L", "XL"];

  return [...byBrand.entries()]
    .map(([brandName, sizeMap]) => {
      const sizes = [...sizeMap.entries()]
        .map(([size, stock]) => ({ size, stock }))
        .sort((a, b) => {
          const ai = sizeOrder.indexOf(a.size);
          const bi = sizeOrder.indexOf(b.size);
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        });
      return { brandName, sizes, total: sizes.reduce((s, r) => s + r.stock, 0) };
    })
    .sort((a, b) => a.brandName.localeCompare(b.brandName));
}

// ─── Stock Up to Supabase ────────────────────────────────────────────────────

export type StockUpEntry = {
  brandName: string;
  categoryName: string;
  size: string;
  quantity: number;
};

async function resolveCategory(userId: string, name: string): Promise<string | null> {
  const { data } = await supabase.from("categories").select("id").eq("created_by", userId).ilike("name", name).limit(1);
  if (data?.length) return data[0].id;
  const { data: c, error } = await supabase
    .from("categories")
    .insert({ name, created_by: userId, updated_by: userId, status: true, description: "" })
    .select("id").single();
  if (error) {
    const { data: r } = await supabase.from("categories").select("id").eq("created_by", userId).ilike("name", name).limit(1);
    return r?.[0]?.id ?? null;
  }
  return c?.id ?? null;
}

async function resolveBrand(userId: string, name: string): Promise<string | null> {
  const { data } = await supabase.from("brands").select("id").eq("created_by", userId).ilike("name", name).limit(1);
  if (data?.length) return data[0].id;
  const { data: c, error } = await supabase
    .from("brands")
    .insert({ name, created_by: userId, updated_by: userId, status: true, description: "" })
    .select("id").single();
  if (error) {
    const { data: r } = await supabase.from("brands").select("id").eq("created_by", userId).ilike("name", name).limit(1);
    return r?.[0]?.id ?? null;
  }
  return c?.id ?? null;
}

async function resolveProduct(userId: string, brandId: string, categoryId: string, name: string): Promise<string | null> {
  const { data } = await supabase
    .from("products").select("id").eq("created_by", userId).eq("brand_id", brandId).is("deleted_at", null).limit(1);
  if (data?.length) return data[0].id;
  const sku = `STOCKUP-${brandId.slice(0, 8)}`;
  const { data: c, error } = await supabase
    .from("products")
    .insert({
      name, category_id: categoryId, brand_id: brandId,
      sku, barcode: sku, qr_code: sku,
      created_by: userId, updated_by: userId, status: true,
      purchase_price: 0, selling_price: 0, gst: 0,
      unit: "pcs", minimum_stock: 0, reorder_level: 0, description: "",
    })
    .select("id").single();
  if (error) {
    const { data: r } = await supabase
      .from("products").select("id").eq("created_by", userId).eq("brand_id", brandId).is("deleted_at", null).limit(1);
    return r?.[0]?.id ?? null;
  }
  return c?.id ?? null;
}

async function resolveProductSize(userId: string, productId: string, size: string): Promise<string | null> {
  const { data } = await supabase
    .from("product_sizes").select("id").eq("product_id", productId).ilike("size", size).limit(1);
  if (data?.length) return data[0].id;
  const { data: c, error } = await supabase
    .from("product_sizes")
    .insert({
      product_id: productId, size: size.toUpperCase(),
      current_stock: 0, available_stock: 0,
      minimum_stock: 0, maximum_stock: 0, purchase_price: 0,
      created_by: userId, updated_by: userId,
    })
    .select("id").single();
  if (error) {
    const { data: r } = await supabase
      .from("product_sizes").select("id").eq("product_id", productId).ilike("size", size).limit(1);
    return r?.[0]?.id ?? null;
  }
  return c?.id ?? null;
}

/** Persists Stock Up quantities to Supabase, auto-creating brand/category/product/size if missing. */
export async function stockUpToSupabase(entries: StockUpEntry[]): Promise<{ synced: number }> {
  const userId = await getCurrentUserId();

  const byBrand = new Map<string, { categoryName: string; items: { size: string; qty: number }[] }>();
  for (const entry of entries) {
    if (!byBrand.has(entry.brandName)) byBrand.set(entry.brandName, { categoryName: entry.categoryName, items: [] });
    byBrand.get(entry.brandName)!.items.push({ size: entry.size, qty: entry.quantity });
  }

  const stockInRows: Record<string, unknown>[] = [];

  for (const [brandName, { categoryName, items }] of byBrand.entries()) {
    const categoryId = await resolveCategory(userId, categoryName);
    if (!categoryId) continue;
    const brandId = await resolveBrand(userId, brandName);
    if (!brandId) continue;
    const productId = await resolveProduct(userId, brandId, categoryId, `${brandName} T-Shirt`);
    if (!productId) continue;

    for (const { size, qty } of items) {
      const productSizeId = await resolveProductSize(userId, productId, size);
      if (!productSizeId) continue;
      stockInRows.push({
        created_by: userId,
        product_id: productId,
        product_size_id: productSizeId,
        transaction_type: "stock_in",
        quantity: qty,
        purchase_cost: 0,
        color: "N/A",
        distributor_id: null,
        supplier_id: null,
        invoice_number: `STOCKUP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        notes: `Stock Up: ${brandName} ${size}`,
        received_date: new Date().toISOString(),
      });
    }
  }

  if (stockInRows.length) {
    const { error } = await supabase.from("stock_entries").insert(stockInRows);
    if (error) throw error;
  }

  return { synced: stockInRows.length };
}

export async function resetInventoryToZero() {
  const userId = await getCurrentUserId();
  const { data: sizes, error: sizesError } = await supabase
    .from("product_sizes")
    .select("id,product_id,current_stock")
    .gt("current_stock", 0);

  if (sizesError) throw sizesError;

  const rows = (sizes ?? [])
    .filter((item) => Number(item.current_stock ?? 0) > 0)
    .map((item) => ({
      created_by: userId,
      product_id: item.product_id,
      product_size_id: item.id,
      distributor_id: null,
      supplier_id: null,
      color: "N/A",
      allocated_to: null,
      allocated_to_type: null,
      invoice_number: `RESET-${new Date().toISOString()}`,
      quantity: Number(item.current_stock ?? 0),
      purchase_cost: 0,
      transaction_type: "stock_out",
      notes: "Inventory reset to zero",
      received_date: new Date().toISOString(),
    }));

  if (!rows.length) {
    return { cleared: 0 };
  }

  const { error } = await supabase.from("stock_entries").insert(rows);
  if (error) throw error;

  return { cleared: rows.length };
}

export async function createStockAllocation(payload: {
  product: string;
  product_size: string;
  quantity: number;
  color: string;
  allocated_to_type: "employee" | "branch" | "person";
  allocated_to: string;
  invoice_number?: string;
  notes: string;
}) {
  const userId = await getCurrentUserId();
  const { data: sizeRow, error: sizeError } = await supabase.from("product_sizes").select("current_stock").eq("id", payload.product_size).single();

  if (sizeError) throw sizeError;

  const availableStock = Number(sizeRow?.current_stock ?? 0);
  if (payload.quantity > availableStock) {
    throw new Error(`Only ${availableStock} units are available for this size.`);
  }

  const referenceNumber = payload.invoice_number?.trim() || `ALLOC-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Math.floor(Math.random() * 9000 + 1000)}`;

  const { data, error } = await supabase
    .from("stock_entries")
    .insert({
      created_by: userId,
      product_id: payload.product,
      product_size_id: payload.product_size,
      distributor_id: null,
      supplier_id: null,
      color: payload.color,
      allocated_to: payload.allocated_to.trim(),
      allocated_to_type: payload.allocated_to_type,
      invoice_number: referenceNumber,
      quantity: payload.quantity,
      purchase_cost: 0,
      transaction_type: "stock_out",
      notes: payload.notes,
      received_date: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function fetchParcels(search?: string) {
  let query = supabase.from("parcels").select("*").order("created_at", { ascending: false });

  if (search?.trim()) {
    query = query.or(
      `parcel_id.ilike.%${search}%,tracking_number.ilike.%${search}%,barcode.ilike.%${search}%,qr_code.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Parcel[];
}

export async function createParcel(payload: {
  parcel_id: string;
  tracking_number: string;
  barcode: string;
  qr_code: string;
  distributor: string | null;
  supplier: string | null;
  invoice_number: string;
  product: string;
  quantity: number;
  dispatch_date: string | null;
  arrival_date: string | null;
  delivery_date: string | null;
  current_location: string;
  current_status: string;
  assigned_person: string;
  remarks: string;
}) {
  const userId = await getCurrentUserId();

  const insertPayload = {
    created_by: userId,
    parcel_id: payload.parcel_id,
    tracking_number: payload.tracking_number,
    barcode: payload.barcode,
    qr_code: payload.qr_code,
    distributor_id: payload.distributor,
    supplier_id: payload.supplier,
    invoice_number: payload.invoice_number,
    product_id: payload.product,
    quantity: payload.quantity,
    dispatch_date: payload.dispatch_date,
    arrival_date: payload.arrival_date,
    delivery_date: payload.delivery_date,
    current_location: payload.current_location,
    current_status: payload.current_status,
    assigned_person: payload.assigned_person,
    remarks: payload.remarks,
  };

  const { data, error } = await supabase.from("parcels").insert(insertPayload).select("*").single();
  if (error) throw error;
  return data;
}
