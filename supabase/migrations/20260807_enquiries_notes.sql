-- Free-text note/remarks field captured on the Enquiry form.
alter table public.enquiries
  add column if not exists notes text not null default '';
