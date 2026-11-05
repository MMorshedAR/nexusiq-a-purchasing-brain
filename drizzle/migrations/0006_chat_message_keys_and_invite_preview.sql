alter table public.chat_messages add column client_message_id text;
create unique index chat_messages_thread_client_message_idx on public.chat_messages(thread_id, client_message_id);

create or replace function public.assert_member_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  _company uuid := coalesce(new.company_id, old.company_id);
begin
  if tg_op = 'UPDATE' and new.role <> old.role then
    if (new.role = 'owner' or old.role = 'owner') and not public.is_company_owner(auth.uid(), _company) then
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

create or replace function public.invite_preview(_token uuid)
returns table(company_name text, invited_email text, invited_role public.company_role, expires_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.name, i.email, i.role, i.expires_at
  from public.team_invites i
  join public.companies c on c.id = i.company_id
  where i.token = _token and i.status = 'pending' and i.expires_at > now()
$$;
grant execute on function public.invite_preview(uuid) to anon, authenticated;