# INVENTRA Supabase Data Access

INVENTRA uses Supabase SDK clients directly from frontend/mobile.

## Auth
- Supabase Auth sign up/sign in/sign out
- Profile bootstrap trigger creates row in `profiles`

## Core Tables
- `profiles`
- `app_settings`
- `categories`
- `brands`
- `distributors`
- `suppliers`
- `products`
- `product_sizes`
- `stock_entries`
- `stock_history`
- `parcels`
- `notifications`
- `activity_logs`

## Inventory & Stock Behavior
- Stock in/out writes are inserted into `stock_entries`.
- Trigger `handle_stock_entry_after_insert` updates `product_sizes`, writes `stock_history`, and generates low-stock notifications.

## Files and Media
- Product images use Storage bucket `product-images`.

## Security
- Row Level Security is enabled across domain tables.
- Policies are owner-scoped using `auth.uid()`.

Schema details and policy source of truth:
- `supabase/migrations/20260801_init.sql`
