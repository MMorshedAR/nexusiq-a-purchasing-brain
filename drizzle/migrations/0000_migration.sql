create type public.company_role as enum ('owner','admin','manager','analyst','viewer');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  business_type text,
  country text not null default 'Bangladesh',
  currency text not null default 'BDT',
  monthly_budget numeric(14,2),
  created_by uuid not null,
  created_at timestamptz not null default now()
);
create table public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null,
  role public.company_role not null default 'viewer',
  full_name text,
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  contact_name text, email text, phone text,
  country text default 'Bangladesh',
  lead_time_days int not null default 7,
  payment_terms text,
  created_at timestamptz not null default now()
);
create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  location text,
  capacity_units int,
  created_at timestamptz not null default now()
);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  sku text not null,
  name text not null,
  category text,
  unit text not null default 'pcs',
  unit_cost numeric(14,2) not null default 0,
  sell_price numeric(14,2) not null default 0,
  supplier_id uuid references public.suppliers(id) on delete set null,
  lead_time_days int not null default 7,
  safety_stock int not null default 0,
  reorder_point int not null default 0,
  created_at timestamptz not null default now(),
  unique (company_id, sku)
);
create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  quantity int not null default 0,
  updated_at timestamptz not null default now(),
  unique (product_id, warehouse_id)
);

grant select, insert, update, delete on public.companies, public.company_members, public.suppliers, public.warehouses, public.products, public.inventory to authenticated;
grant all on public.companies, public.company_members, public.suppliers, public.warehouses, public.products, public.inventory to service_role;

alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.suppliers enable row level security;
alter table public.warehouses enable row level security;
alter table public.products enable row level security;
alter table public.inventory enable row level security;

create or replace function public.is_company_member(_company uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.company_members where company_id = _company and user_id = auth.uid())
$$;
create or replace function public.can_edit_company(_company uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.company_members where company_id = _company and user_id = auth.uid() and role in ('owner','admin','manager'))
$$;
create or replace function public.is_company_admin(_company uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.company_members where company_id = _company and user_id = auth.uid() and role in ('owner','admin'))
$$;

create policy "members read company" on public.companies for select to authenticated using (public.is_company_member(id));
create policy "admins update company" on public.companies for update to authenticated using (public.is_company_admin(id));

create policy "members read members" on public.company_members for select to authenticated using (public.is_company_member(company_id));
create policy "admins manage members" on public.company_members for update to authenticated using (public.is_company_admin(company_id));
create policy "admins delete members" on public.company_members for delete to authenticated using (public.is_company_admin(company_id) and user_id <> auth.uid());

do $$ declare t text; begin
  foreach t in array array['suppliers','warehouses','products','inventory'] loop
    execute format('create policy "members read" on public.%I for select to authenticated using (public.is_company_member(company_id))', t);
    execute format('create policy "editors insert" on public.%I for insert to authenticated with check (public.can_edit_company(company_id))', t);
    execute format('create policy "editors update" on public.%I for update to authenticated using (public.can_edit_company(company_id))', t);
    execute format('create policy "editors delete" on public.%I for delete to authenticated using (public.can_edit_company(company_id))', t);
  end loop;
end $$;

create or replace function public.create_company(_name text, _slug text, _business_type text, _country text, _currency text, _budget numeric, _full_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if _slug !~ '^[a-z0-9][a-z0-9-]{2,39}$' then raise exception 'Invalid workspace slug'; end if;
  if exists (select 1 from companies where slug = _slug) then raise exception 'Workspace slug already taken'; end if;
  insert into companies(name, slug, business_type, country, currency, monthly_budget, created_by)
  values (_name, _slug, _business_type, coalesce(_country,'Bangladesh'), coalesce(_currency,'BDT'), _budget, auth.uid())
  returning id into cid;
  insert into company_members(company_id, user_id, role, full_name) values (cid, auth.uid(), 'owner', _full_name);
  insert into warehouses(company_id, name, location) values (cid, 'Main Warehouse', coalesce(_country,'Bangladesh'));
  return cid;
end $$;

create or replace function public.slug_available(_slug text)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.companies where slug = lower(_slug))
$$;
grant execute on function public.create_company(text,text,text,text,text,numeric,text) to authenticated;
grant execute on function public.slug_available(text) to anon, authenticated;