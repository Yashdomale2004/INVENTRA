# Deployment Guide

## Target Architecture
- Supabase: PostgreSQL + Auth + Storage + Edge Functions
- Frontend: Vercel (Vite React app)
- Mobile: Expo app using Supabase client SDK

No Python/Django backend server is used.

## Supabase Setup
1. Create a Supabase project.
2. Run SQL from `supabase/migrations/20260801_init.sql` in SQL Editor.
3. Verify RLS policies and storage bucket `product-images` are created.
4. Deploy edge function:
	- `supabase functions deploy low-stock-alert`
5. Set edge function secrets:
	- `SUPABASE_URL`
	- `SUPABASE_SERVICE_ROLE_KEY`

## Frontend Deployment (Vercel)
1. Set project root to `frontend`.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Environment variables:
	- `VITE_SUPABASE_URL`
	- `VITE_SUPABASE_ANON_KEY`

## Mobile Deployment (Expo)
1. Configure environment variables:
	- `EXPO_PUBLIC_SUPABASE_URL`
	- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
2. Install and run:
	- `npm install`
	- `npm run start`
3. Build using EAS for production release.
