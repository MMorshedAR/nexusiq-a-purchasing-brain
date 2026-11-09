ALTER TABLE public.company_members
  ADD COLUMN branch_scoped boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_company_member(_company uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = _company AND cm.user_id = auth.uid() AND NOT cm.branch_scoped
  )
$$;

CREATE OR REPLACE FUNCTION public.can_edit_company(_company uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = _company AND cm.user_id = auth.uid() AND NOT cm.branch_scoped
      AND cm.role IN ('owner'::public.company_role, 'admin'::public.company_role, 'manager'::public.company_role)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(_company uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = _company AND cm.user_id = auth.uid() AND NOT cm.branch_scoped
      AND cm.role IN ('owner'::public.company_role, 'admin'::public.company_role)
  )
$$;

ALTER TABLE public.team_invites
  ADD COLUMN branch_id uuid,
  ADD COLUMN branch_role public.branch_access_role;
ALTER TABLE public.team_invites ADD CONSTRAINT team_invites_branch_company_fkey
  FOREIGN KEY (branch_id, company_id) REFERENCES public.branches(id, company_id) ON DELETE SET NULL (branch_id);
ALTER TABLE public.team_invites ADD CONSTRAINT team_invites_branch_role_pair
  CHECK ((branch_id IS NULL AND branch_role IS NULL) OR (branch_id IS NOT NULL AND branch_role IS NOT NULL AND role = 'viewer'::public.company_role));
CREATE INDEX team_invites_branch_idx ON public.team_invites(company_id, branch_id) WHERE branch_id IS NOT NULL;

DROP POLICY IF EXISTS "admins manage invites" ON public.team_invites;
CREATE POLICY "admins manage invites" ON public.team_invites FOR ALL TO authenticated
USING (
  (branch_id IS NULL AND public.is_company_admin(company_id)) OR
  (branch_id IS NOT NULL AND public.is_company_owner(auth.uid(), company_id))
)
WITH CHECK (
  ((branch_id IS NULL AND public.is_company_admin(company_id)) OR
   (branch_id IS NOT NULL AND public.is_company_owner(auth.uid(), company_id)))
  AND (role <> 'owner'::public.company_role OR public.is_company_owner(auth.uid(), company_id))
);

CREATE OR REPLACE FUNCTION public.claim_invite(_token uuid, _email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv public.team_invites%rowtype;
  uid uuid := auth.uid();
  full_name text;
  account_email text;
BEGIN
  IF uid IS NULL THEN RETURN 'unauthenticated'; END IF;
  SELECT * INTO inv FROM public.team_invites WHERE token = _token AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RETURN 'invalid'; END IF;
  IF inv.expires_at < now() THEN RETURN 'expired'; END IF;
  SELECT email, coalesce(raw_user_meta_data->>'full_name', '')
    INTO account_email, full_name FROM auth.users WHERE id = uid;
  IF account_email IS NULL OR lower(inv.email) <> lower(_email) OR lower(inv.email) <> lower(account_email) THEN
    RETURN 'wrong_account';
  END IF;
  IF inv.branch_id IS NOT NULL THEN
    IF NOT public.is_company_owner(inv.invited_by, inv.company_id) OR inv.branch_role IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.branches b WHERE b.id = inv.branch_id AND b.company_id = inv.company_id AND b.status = 'active'
    ) THEN RETURN 'invalid'; END IF;
    INSERT INTO public.company_members(company_id, user_id, role, full_name, branch_scoped)
    VALUES (inv.company_id, uid, 'viewer'::public.company_role, nullif(full_name, ''), true)
    ON CONFLICT (company_id, user_id) DO UPDATE SET branch_scoped = true
      WHERE public.company_members.role = 'viewer'::public.company_role;
    IF EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = inv.company_id AND cm.user_id = uid AND cm.branch_scoped
    ) THEN
      INSERT INTO public.branch_members(company_id, branch_id, user_id, role, full_name)
      VALUES (inv.company_id, inv.branch_id, uid, inv.branch_role, nullif(full_name, ''))
      ON CONFLICT (branch_id, user_id) DO UPDATE SET role = EXCLUDED.role, full_name = EXCLUDED.full_name;
    END IF;
  ELSE
    IF inv.role = 'owner'::public.company_role AND NOT public.is_company_owner(inv.invited_by, inv.company_id) THEN
      RETURN 'invalid';
    END IF;
    INSERT INTO public.company_members(company_id, user_id, role, full_name)
    VALUES (inv.company_id, uid, inv.role, nullif(full_name, ''))
    ON CONFLICT (company_id, user_id) DO NOTHING;
  END IF;
  UPDATE public.team_invites SET status = 'accepted' WHERE id = inv.id;
  RETURN 'ok';
END $$;
REVOKE EXECUTE ON FUNCTION public.claim_invite(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.claim_invite(uuid, text) TO authenticated;