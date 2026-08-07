alter table public.products
  alter column sku drop not null,
  alter column barcode drop not null,
  alter column qr_code drop not null;
