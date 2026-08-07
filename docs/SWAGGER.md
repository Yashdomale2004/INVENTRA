# API Surface (Supabase)

INVENTRA no longer uses a Django REST server, so there are no `/api/schema` or Swagger endpoints.

Current API surface is provided by:
- Supabase PostgREST (table access with RLS)
- Supabase Auth endpoints
- Supabase Edge Functions (for background/server-side workflows)

Refer to:
- `supabase/migrations/20260801_init.sql` for data model and policies
- `supabase/functions/low-stock-alert/index.ts` for edge-function behavior
