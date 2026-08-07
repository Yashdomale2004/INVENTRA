# Supabase Setup

1. Create a Supabase project.
2. Run SQL in `supabase/migrations/20260801_init.sql`.
3. Set frontend env vars:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. In Supabase Auth settings, turn off email confirmation for password signups:
   - Authentication -> Providers -> Email -> disable `Confirm email`
5. Deploy edge function:
   - `supabase functions deploy low-stock-alert`
6. Set function secrets:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Frontend Deploy (Vercel)
- Root: `frontend`
- Build command: `npm run build`
- Output: `dist`
