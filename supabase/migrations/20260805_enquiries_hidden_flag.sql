-- Soft-hide flag for enquiries: hides a saved enquiry from the Enquiry page's
-- Saved Enquiries list and from Order History, without deleting the row.
alter table public.enquiries
  add column if not exists hidden boolean not null default false;
