-- OCR-extracted, user-editable address text from the shipping screenshot uploaded on the Enquiry form.
alter table public.enquiries
  add column if not exists extracted_address text not null default '';
