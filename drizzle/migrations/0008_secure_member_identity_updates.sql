create or replace function public.assert_member_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  _company uuid := coalesce(new.company_id, old.company_id);
begin
  if tg_op = 'UPDATE' then
    if new.id <> old.id or new.company_id <> old.company_id or new.user_id <> old.user_id then
      raise exception 'Workspace member identity cannot be changed';
    end if;
    if new.role <> old.role and (new.role = 'owner' or old.role = 'owner')
       and not public.is_company_owner(auth.uid(), _company) then
      raise exception 'Only an Owner can change an Owner role';
    end if;
    if old.role = 'owner' and new.role <> 'owner' and public.count_owners(_company) <= 1 then
      raise exception 'A workspace must keep at least one Owner';
    end if;
  end if;
  if tg_op = 'DELETE' and old.role = 'owner' then
    if not public.is_company_owner(auth.uid(), old.company_id) then
      raise exception 'Only an Owner can remove an Owner';
    end if;
    if public.count_owners(old.company_id) <= 1 then
      raise exception 'A workspace must keep at least one Owner';
    end if;
  end if;
  return coalesce(new, old);
end $$;

drop policy if exists "admins manage members" on public.company_members;
create policy "admins manage members" on public.company_members
for update to authenticated
using (public.is_company_admin(company_id))
with check (public.is_company_admin(company_id));