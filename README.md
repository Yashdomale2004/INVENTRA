# INVENTRA (Supabase Edition)

INVENTRA is a frontend-only, Supabase-powered stock management system.

## Stack
- Frontend: React + Vite + TypeScript + Tailwind + TanStack Query + React Hook Form + Zod
- Backend services: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- Deployment: Vercel (frontend) + Supabase (database/services)

## Project Layout

```txt
INVENTRA/
  frontend/
    src/
      app/
      components/
      contexts/
      hooks/
      layouts/
      lib/
      pages/
      services/
      types/
  supabase/
    migrations/
      20260801_init.sql
    functions/
      low-stock-alert/
        index.ts
```

## Setup

1. Create a Supabase project.
2. Run SQL migration from [supabase/migrations/20260801_init.sql](supabase/migrations/20260801_init.sql).
3. Configure frontend env from [frontend/.env.example](frontend/.env.example).
4. Install frontend dependencies and run:

```bash
cd frontend
npm install
npm run dev
```

## Deploy

- Frontend on Vercel (root: frontend)
- Supabase handles Auth + DB + Storage + Edge Functions
- Deploy edge function:

```bash
supabase functions deploy low-stock-alert
```

More detail: [supabase/README.md](supabase/README.md)
