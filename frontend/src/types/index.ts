export type DashboardStats = {
  total_products: number;
  total_distributors: number;
  total_suppliers: number;
  inventory_value: number;
  total_stock: number;
  today_received: number;
  today_allocated: number;
  low_stock: number;
  out_of_stock: number;
  recent_stock_received: Array<{
    id: string;
    product_name: string;
    product_size_name: string;
    color: string;
    quantity: number;
    transaction_date: string;
    source_name: string;
    notes: string;
  }>;
  recent_allocations: Array<{
    id: string;
    product_name: string;
    product_size_name: string;
    color: string;
    quantity: number;
    transaction_date: string;
    allocated_to: string;
    allocated_to_type: string;
    notes: string;
  }>;
  recent_parcels: Array<{ id: string; parcel_id: string; tracking_number: string; current_status: string; current_location: string; updated_at: string }>;
  recent_notifications: Array<{ id: string; title: string; message: string; notification_type: string; is_read: boolean; created_at: string }>;
};

export type AnalyticsOverview = {
  daily_allocations: number;
  monthly_allocations: number;
  yearly_allocations: number;
  inventory_value: number;
  top_products: Array<{ product__name: string; quantity: number }>;
  parcel_status: Array<{ current_status: string; total: number }>;
  distributor_receipt_pivot: Array<{
    distributor_id: number;
    distributor_name: string;
    company_name: string;
    current_month_qty: number;
    previous_month_qty: number;
    current_month_value: number;
    previous_month_value: number;
  }>;
  allocation_recipient_pivot: Array<{
    recipient_key: string;
    recipient_name: string;
    recipient_type: string;
    quantity: number;
  }>;
  pivot_window: {
    current_month_start: string;
    previous_month_start: string;
    previous_month_end: string;
  };
};

export type Product = {
  id: string;
  name: string;
  category: string;
  brand: string;
  sku: string;
  barcode: string;
  qr_code: string;
  selling_price: string;
  purchase_price: string;
  gst: string;
  unit: string;
  description: string;
  status: boolean;
  minimum_stock: number;
  reorder_level: number;
  image: string | null;
  sizes?: ProductSize[];
  category_name?: string;
  brand_name?: string;
};

export type ProductSize = {
  id: string;
  product: string;
  size: string;
  current_stock: number;
  minimum_stock?: number;
  maximum_stock?: number;
  last_updated?: string;
  purchase_price?: string;
};

export type Distributor = {
  id: string;
  company_name: string;
  distributor_name: string;
  mobile: string;
  whatsapp: string;
  email: string;
  gst_number: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  status: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Supplier = {
  id: string;
  supplier_name: string;
  company_name: string;
  mobile: string;
  email: string;
  gst: string;
  address: string;
  city: string;
  state: string;
  status: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Category = { id: string; name: string; description: string; status: boolean };

export type Brand = { id: string; name: string; description: string; status: boolean };

export type StockTransaction = {
  id: string;
  product: string;
  product_size: string;
  product_name?: string;
  product_size_name?: string;
  transaction_type: string;
  quantity: number;
  unit_cost: string;
  selling_price: string;
  color: string;
  distributor: string | null;
  distributor_name?: string | null;
  supplier: string | null;
  supplier_name?: string | null;
  allocated_to: string | null;
  allocated_to_type: string | null;
  invoice_number: string;
  notes: string;
  transaction_date: string;
};

export type Parcel = {
  id: string;
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
};

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
};
