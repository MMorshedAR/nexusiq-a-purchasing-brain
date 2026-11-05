create or replace function public.claim_invite(_token uuid, _email text)
returns text language plpgsql security definer set search_path = public as $$
declare
  inv public.team_invites%rowtype;
  uid uuid := auth.uid();
  full_name text;
  account_email text;
begin
  if uid is null then return 'unauthenticated'; end if;
  select * into inv from public.team_invites where token = _token and status = 'pending' for update;
  if not found then return 'invalid'; end if;
  if inv.expires_at < now() then return 'expired'; end if;
  select email, coalesce(raw_user_meta_data->>'full_name', '')
    into account_email, full_name from auth.users where id = uid;
  if account_email is null or lower(inv.email) <> lower(_email) or lower(inv.email) <> lower(account_email) then
    return 'wrong_account';
  end if;
  insert into public.company_members (company_id, user_id, role, full_name)
  values (inv.company_id, uid, inv.role, nullif(full_name, ''))
  on conflict (company_id, user_id) do nothing;
  update public.team_invites set status = 'accepted' where id = inv.id;
  return 'ok';
end $$;
revoke execute on function public.claim_invite(uuid, text) from anon, public;
grant execute on function public.claim_invite(uuid, text) to authenticated;