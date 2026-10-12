create type public.po_status as enum ('draft','approved','received','cancelled');

create table public.sales_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  sale_date date not null,
  quantity int not null check (quantity >= 0),
  created_at timestamptz not null default now()
);
create index sales_history_company_product_date on public.sales_history(company_id, product_id, sale_date);

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  po_number text not null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  warehouse_id uuid references public.warehouses(id) on delete set null,
  status public.po_status not null default 'draft',
  order_date date not null default current_date,
  expected_date date,
  notes text,
  created_by uuid,
  approved_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  unique (company_id, po_number)
);
create table public.po_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  po_id uuid not null references public.purchase_orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity int not null check (quantity > 0),
  unit_cost numeric(14,2) not null default 0
);

grant select, insert, update, delete on public.sales_history, public.purchase_orders, public.po_items to authenticated;
grant all on public.sales_history, public.purchase_orders, public.po_items to service_role;
alter table public.sales_history enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.po_items enable row level security;

do $$ declare t text; begin
  foreach t in array array['sales_history','purchase_orders','po_items'] loop
    execute format('create policy "members read" on public.%I for select to authenticated using (public.is_company_member(company_id))', t);
    execute format('create policy "editors insert" on public.%I for insert to authenticated with check (public.can_edit_company(company_id))', t);
    execute format('create policy "editors update" on public.%I for update to authenticated using (public.can_edit_company(company_id))', t);
    execute format('create policy "editors delete" on public.%I for delete to authenticated using (public.can_edit_company(company_id))', t);
  end loop;
end $$;

create or replace function public.receive_purchase_order(_po uuid)
returns void language plpgsql security definer set search_path = public as $$
declare po record;
begin
  select * into po from purchase_orders where id = _po for update;
  if po is null then raise exception 'Purchase order not found'; end if;
  if not public.can_edit_company(po.company_id) then raise exception 'Not allowed'; end if;
  if po.status <> 'approved' then raise exception 'Only approved orders can be received'; end if;
  if po.warehouse_id is null then raise exception 'Choose a receiving warehouse first'; end if;
  insert into inventory(company_id, product_id, warehouse_id, quantity, updated_at)
  select po.company_id, i.product_id, po.warehouse_id, sum(i.quantity), now()
  from po_items i where i.po_id = _po group by i.product_id
  on conflict (product_id, warehouse_id) do update set quantity = inventory.quantity + excluded.quantity, updated_at = now();
  update purchase_orders set status = 'received', received_at = now() where id = _po;
end $$;
grant execute on function public.receive_purchase_order(uuid) to authenticated;