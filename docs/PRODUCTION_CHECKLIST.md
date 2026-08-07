# Production Checklist

- [ ] Restrict Supabase Auth providers and configure password policies
- [ ] Confirm all production tables have RLS enabled
- [ ] Validate owner-scoped policies with a non-owner test account
- [ ] Configure Supabase database backups and point-in-time recovery
- [ ] Configure observability and logs (Supabase + Vercel)
- [ ] Secure edge function secrets (service role key never exposed to clients)
- [ ] Validate low-stock notifications and stock trigger flows end-to-end
- [ ] Enable CI lint/test/build pipelines
- [ ] Configure Storage bucket policies and public asset rules
- [ ] Validate barcode and parcel scan workflows on real devices
