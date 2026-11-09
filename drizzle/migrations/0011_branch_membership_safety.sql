CREATE OR REPLACE FUNCTION public.claim_invite(_token uuid, _email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv public.team_invites%rowtype;
  uid uuid := auth.uid();
  full_name text;
  account_email text;
  existing_role public.company_role;
  existing_branch_scoped boolean;
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
    SELECT role, branch_scoped INTO existing_role, existing_branch_scoped FROM public.company_members
      WHERE company_id = inv.company_id AND user_id = uid;
    IF FOUND AND (existing_role <> 'viewer'::public.company_role OR NOT existing_branch_scoped) THEN
      RETURN 'already_member';
    END IF;
    INSERT INTO public.company_members(company_id, user_id, role, full_name, branch_scoped)
    VALUES (inv.company_id, uid, 'viewer'::public.company_role, nullif(full_name, ''), true)
    ON CONFLICT (company_id, user_id) DO NOTHING;
    INSERT INTO public.branch_members(company_id, branch_id, user_id, role, full_name)
    VALUES (inv.company_id, inv.branch_id, uid, inv.branch_role, nullif(full_name, ''))
    ON CONFLICT (branch_id, user_id) DO UPDATE SET role = EXCLUDED.role, full_name = EXCLUDED.full_name;
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

CREATE OR REPLACE FUNCTION public.assert_branch_member_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.id <> OLD.id OR NEW.company_id <> OLD.company_id OR NEW.branch_id <> OLD.branch_id OR NEW.user_id <> OLD.user_id THEN
    RAISE EXCEPTION 'Branch member identity cannot be changed';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER branch_member_identity_guard BEFORE UPDATE ON public.branch_members
FOR EACH ROW EXECUTE FUNCTION public.assert_branch_member_identity();