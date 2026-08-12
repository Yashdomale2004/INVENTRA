-- Fix "Plain T-Shirts T-Shirt" naming, and backfill the full S/M/L/XL/XXL
-- size range for the five core products (some were created before XXL/other
-- sizes were required, so they're missing rows).
update public.products
set name = 'Plain T-Shirt', updated_at = now()
where name = 'Plain T-Shirts T-Shirt';

insert into public.product_sizes (product_id, size, created_by, updated_by)
select p.id, s.size, p.created_by, p.created_by
from public.products p
cross join (values ('S'), ('M'), ('L'), ('XL'), ('XXL')) as s(size)
where p.name in ('Ceramic Shield T-Shirt', 'Plain T-Shirt', 'Sunkool T-Shirt', 'Puma T-Shirt', 'RS T-Shirt')
on conflict (product_id, size) do nothing;
