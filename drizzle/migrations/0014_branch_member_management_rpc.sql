ALTER TABLE public.employees ALTER COLUMN employee_code SET DEFAULT ('EMP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)));

CREATE OR REPLACE FUNCTION public.manage_branch_member(_branch uuid, _user uuid, _role public.branch_access_role)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.branches%rowtype; cm public.company_members%rowtype; assignment_id uuid; existing_user uuid;
BEGIN
  SELECT * INTO b FROM public.branches WHERE id = _branch FOR UPDATE;
  IF NOT FOUND OR NOT public.is_company_owner(auth.uid(), b.company_id) THEN RAISE EXCEPTION 'Only the company Owner can assign branch access'; END IF;
  IF b.status <> 'active' THEN RAISE EXCEPTION 'Activate the branch before assigning access'; END IF;
  IF _role IS NULL THEN RAISE EXCEPTION 'A branch role is required'; END IF;
  SELECT id INTO existing_user FROM auth.users WHERE id = _user;
  IF NOT FOUND THEN RAISE EXCEPTION 'User account not found'; END IF;
  SELECT * INTO cm FROM public.company_members WHERE company_id = b.company_id AND user_id = _user FOR UPDATE;
  IF FOUND THEN
    IF cm.role = 'owner'::public.company_role THEN RAISE EXCEPTION 'Company Owners cannot be restricted to a branch'; END IF;
    UPDATE public.company_members SET role = 'viewer'::public.company_role, branch_scoped = true
      WHERE company_id = b.company_id AND user_id = _user;
  ELSE
    INSERT INTO public.company_members(company_id, user_id, role, branch_scoped)
    VALUES (b.company_id, _user, 'viewer'::public.company_role, true);
  END IF;
  INSERT INTO public.branch_members(company_id, branch_id, user_id, role)
  VALUES (b.company_id, b.id, _user, _role)
  ON CONFLICT (branch_id, user_id) DO UPDATE SET role = EXCLUDED.role
  RETURNING id INTO assignment_id;
  RETURN assignment_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.manage_branch_member(uuid, uuid, public.branch_access_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_branch_member(uuid, uuid, public.branch_access_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_branch_member(_assignment uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bm public.branch_members%rowtype;
BEGIN
  SELECT * INTO bm FROM public.branch_members WHERE id = _assignment FOR UPDATE;
  IF NOT FOUND OR NOT public.is_company_owner(auth.uid(), bm.company_id) THEN RAISE EXCEPTION 'Only the company Owner can remove branch access'; END IF;
  DELETE FROM public.branch_members WHERE id = bm.id;
  DELETE FROM public.company_members cm WHERE cm.company_id = bm.company_id AND cm.user_id = bm.user_id
    AND cm.branch_scoped AND cm.role = 'viewer'::public.company_role
    AND NOT EXISTS (SELECT 1 FROM public.branch_members other WHERE other.company_id = bm.company_id AND other.user_id = bm.user_id);
END $$;
REVOKE EXECUTE ON FUNCTION public.remove_branch_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_branch_member(uuid) TO authenticated;