drop policy if exists "admins manage invites" on public.team_invites;
create policy "admins manage invites" on public.team_invites
for all to authenticated
using (public.is_company_admin(company_id))
with check (
  public.is_company_admin(company_id)
  and (role <> 'owner' or public.is_company_owner(auth.uid(), company_id))
);

create or replace function public.claim_invite(_token uuid, _email text)
returns text language plpgsql security definer set search_path = public as $$
declare
  inv public.team_invites%rowtype;
  uid uuid := auth.uid();
  full_name text;
begin
  if uid is null then return 'unauthenticated'; end if;
  select * into inv from public.team_invites where token = _token and status = 'pending' for update;
  if not found then return 'invalid'; end if;
  if inv.expires_at < now() then return 'expired'; end if;
  if lower(inv.email) <> lower(_email) then return 'wrong_account'; end if;
  if inv.role = 'owner' and not public.is_company_owner(inv.invited_by, inv.company_id) then return 'invalid'; end if;
  select coalesce(raw_user_meta_data->>'full_name', '') into full_name from auth.users where id = uid;
  insert into public.company_members (company_id, user_id, role, full_name)
  values (inv.company_id, uid, inv.role, nullif(full_name, ''))
  on conflict (company_id, user_id) do nothing;
  update public.team_invites set status = 'accepted' where id = inv.id;
  return 'ok';
end $$;