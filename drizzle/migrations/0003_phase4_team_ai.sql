create table public.team_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  role public.company_role not null default 'viewer',
  token uuid not null default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  invited_by uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days'
);
create index team_invites_company_idx on public.team_invites(company_id);

create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index chat_threads_company_idx on public.chat_threads(company_id, updated_at desc);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('user','assistant')),
  parts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index chat_messages_thread_idx on public.chat_messages(thread_id, created_at);

grant select, insert, update, delete on public.team_invites to authenticated;
grant all on public.team_invites to service_role;
alter table public.team_invites enable row level security;
create policy "admins manage invites" on public.team_invites for all to authenticated
  using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

grant select, insert, update, delete on public.chat_threads, public.chat_messages to authenticated;
grant all on public.chat_threads, public.chat_messages to service_role;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;
create policy "own threads" on public.chat_threads for all to authenticated
  using (public.is_company_member(company_id) and user_id = auth.uid())
  with check (public.is_company_member(company_id) and user_id = auth.uid());
create policy "own messages" on public.chat_messages for all to authenticated
  using (public.is_company_member(company_id) and user_id = auth.uid())
  with check (public.is_company_member(company_id) and user_id = auth.uid());

create or replace function public.count_owners(_company uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.company_members where company_id = _company and role = 'owner'
$$;

create or replace function public.is_company_owner(_user uuid, _company uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.company_members where user_id = _user and company_id = _company and role = 'owner')
$$;

create or replace function public.assert_member_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  _company uuid := coalesce(new.company_id, old.company_id);
begin
  if tg_op = 'UPDATE' and new.role <> old.role then
    if new.role = 'owner' and old.role <> 'owner' and not public.is_company_owner(auth.uid(), _company) then
      raise exception 'Only an Owner can grant the Owner role';
    end if;
    if old.role = 'owner' and new.role <> 'owner' and public.count_owners(_company) <= 1 then
      raise exception 'A workspace must keep at least one Owner';
    end if;
  end if;
  if tg_op = 'DELETE' and old.role = 'owner' and public.count_owners(old.company_id) <= 1 then
    raise exception 'A workspace must keep at least one Owner';
  end if;
  return coalesce(new, old);
end $$;
create trigger member_role_guard before update or delete on public.company_members
  for each row execute function public.assert_member_change();

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
  select coalesce(raw_user_meta_data->>'full_name', '') into full_name from auth.users where id = uid;
  insert into public.company_members (company_id, user_id, role, full_name)
  values (inv.company_id, uid, inv.role, nullif(full_name, ''))
  on conflict (company_id, user_id) do nothing;
  update public.team_invites set status = 'accepted' where id = inv.id;
  return 'ok';
end $$;
revoke execute on function public.claim_invite(uuid, text) from anon, public;
grant execute on function public.claim_invite(uuid, text) to authenticated;