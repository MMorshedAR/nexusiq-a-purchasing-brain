create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_id uuid,
  actor_email text,
  action text not null,
  entity text not null,
  entity_id uuid,
  summary text,
  created_at timestamptz not null default now()
);
create index audit_log_company_created on public.audit_log(company_id, created_at desc);
grant select on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;
create policy "members read audit" on public.audit_log for select to authenticated using (public.is_company_member(company_id));

create or replace function public.write_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record; label text;
begin
  r := case when tg_op = 'DELETE' then old else new end;
  label := case tg_table_name
    when 'products' then r.name || ' (' || r.sku || ')'
    when 'suppliers' then r.name
    when 'warehouses' then r.name
    when 'purchase_orders' then r.po_number || coalesce(' → ' || r.status::text, '')
    else null end;
  if tg_table_name = 'inventory' then
    select p.name || ': ' || coalesce(old.quantity::text, '0') || ' → ' || coalesce(new.quantity::text, '0')
      into label from products p where p.id = r.product_id;
  end if;
  if tg_op = 'UPDATE' and tg_table_name = 'inventory' and old.quantity = new.quantity then return null; end if;
  insert into audit_log(company_id, actor_id, actor_email, action, entity, entity_id, summary)
  values (r.company_id, auth.uid(), (select email from auth.users where id = auth.uid()), lower(tg_op), tg_table_name, r.id, label);
  return null;
end $$;

create trigger audit_products after insert or update or delete on public.products for each row execute function public.write_audit();
create trigger audit_suppliers after insert or update or delete on public.suppliers for each row execute function public.write_audit();
create trigger audit_warehouses after insert or update or delete on public.warehouses for each row execute function public.write_audit();
create trigger audit_pos after insert or update or delete on public.purchase_orders for each row execute function public.write_audit();
create trigger audit_inventory after insert or update or delete on public.inventory for each row execute function public.write_audit();