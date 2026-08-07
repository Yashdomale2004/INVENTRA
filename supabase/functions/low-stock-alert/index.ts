// Supabase Edge Function: low-stock-alert
// Deploy with: supabase functions deploy low-stock-alert --project-ref <project-ref>
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: lowStockRows, error } = await supabase
    .from("product_sizes")
    .select("id,size,current_stock,minimum_stock,products:product_id(name,created_by)")
    .lte("current_stock", 0);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const notifications = (lowStockRows ?? []).map((row: any) => ({
    title: "Low Stock Alert",
    message: `${row.products?.name ?? "Product"} (${row.size}) has only ${row.current_stock} units remaining.`,
    notification_type: row.current_stock <= 0 ? "out_of_stock" : "low_stock",
    user_id: row.products?.created_by,
  })).filter((item: any) => item.user_id);

  if (notifications.length > 0) {
    await supabase.from("notifications").insert(notifications);
  }

  return new Response(JSON.stringify({ inserted: notifications.length }), { status: 200 });
});
