ALTER TABLE public.companies
  ADD COLUMN company_email text,
  ADD COLUMN phone text,
  ADD COLUMN address text,
  ADD COLUMN city text,
  ADD COLUMN website text,
  ADD COLUMN tax_id text,
  ADD COLUMN registration_number text,
  ADD COLUMN logo_path text;

CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  branch_code text NOT NULL,
  address text,
  phone text,
  email text,
  opening_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, branch_code),
  UNIQUE (id, company_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE TYPE public.branch_access_role AS ENUM ('admin', 'manager', 'employee');

CREATE TABLE public.branch_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role public.branch_access_role NOT NULL DEFAULT 'employee',
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (branch_id, company_id) REFERENCES public.branches(id, company_id) ON DELETE CASCADE,
  UNIQUE (branch_id, user_id),
  UNIQUE (id, company_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branch_members TO authenticated;
GRANT ALL ON public.branch_members TO service_role;
ALTER TABLE public.branch_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX branch_members_company_user_idx ON public.branch_members(company_id, user_id);
CREATE INDEX branch_members_branch_role_idx ON public.branch_members(branch_id, role);

ALTER TABLE public.warehouses ADD COLUMN branch_id uuid;
ALTER TABLE public.warehouses ADD CONSTRAINT warehouses_branch_company_fkey
  FOREIGN KEY (branch_id, company_id) REFERENCES public.branches(id, company_id) ON DELETE SET NULL (branch_id);
CREATE INDEX warehouses_company_branch_idx ON public.warehouses(company_id, branch_id);

ALTER TABLE public.sales_history ADD COLUMN branch_id uuid;
ALTER TABLE public.sales_history ADD CONSTRAINT sales_history_branch_company_fkey
  FOREIGN KEY (branch_id, company_id) REFERENCES public.branches(id, company_id) ON DELETE SET NULL (branch_id);
CREATE INDEX sales_history_company_branch_date_idx ON public.sales_history(company_id, branch_id, sale_date);

ALTER TABLE public.purchase_orders ADD COLUMN branch_id uuid;
ALTER TABLE public.purchase_orders ADD CONSTRAINT purchase_orders_branch_company_fkey
  FOREIGN KEY (branch_id, company_id) REFERENCES public.branches(id, company_id) ON DELETE SET NULL (branch_id);
CREATE INDEX purchase_orders_company_branch_date_idx ON public.purchase_orders(company_id, branch_id, order_date DESC);

ALTER TABLE public.audit_log ADD COLUMN branch_id uuid;
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_branch_company_fkey
  FOREIGN KEY (branch_id, company_id) REFERENCES public.branches(id, company_id) ON DELETE SET NULL (branch_id);
CREATE INDEX audit_log_company_branch_created_idx ON public.audit_log(company_id, branch_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.is_company_member(_company uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = _company AND cm.user_id = auth.uid()
      AND (cm.role <> 'viewer'::public.company_role OR NOT EXISTS (
        SELECT 1 FROM public.branch_members bm
        WHERE bm.company_id = cm.company_id AND bm.user_id = cm.user_id
      ))
  )
$$;

CREATE OR REPLACE FUNCTION public.can_edit_company(_company uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = _company AND cm.user_id = auth.uid()
      AND cm.role IN ('owner'::public.company_role, 'admin'::public.company_role, 'manager'::public.company_role)
      AND NOT EXISTS (
        SELECT 1 FROM public.branch_members bm
        WHERE bm.company_id = cm.company_id AND bm.user_id = cm.user_id
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(_company uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = _company AND cm.user_id = auth.uid()
      AND cm.role IN ('owner'::public.company_role, 'admin'::public.company_role)
      AND NOT EXISTS (
        SELECT 1 FROM public.branch_members bm
        WHERE bm.company_id = cm.company_id AND bm.user_id = cm.user_id
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.is_branch_member(_company uuid, _branch uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.branch_members bm
    WHERE bm.company_id = _company AND bm.branch_id = _branch AND bm.user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_branch_admin(_company uuid, _branch uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_company_owner(auth.uid(), _company) OR EXISTS (
    SELECT 1 FROM public.branch_members bm
    WHERE bm.company_id = _company AND bm.branch_id = _branch
      AND bm.user_id = auth.uid() AND bm.role = 'admin'::public.branch_access_role
  )
$$;

CREATE OR REPLACE FUNCTION public.can_edit_branch(_company uuid, _branch uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_edit_company(_company) OR EXISTS (
    SELECT 1 FROM public.branch_members bm
    WHERE bm.company_id = _company AND bm.branch_id = _branch AND bm.user_id = auth.uid()
      AND bm.role IN ('admin'::public.branch_access_role, 'manager'::public.branch_access_role)
  )
$$;

DROP POLICY IF EXISTS "members read company" ON public.companies;
CREATE POLICY "members read company" ON public.companies FOR SELECT TO authenticated
USING (public.is_company_member(id) OR EXISTS (
  SELECT 1 FROM public.branch_members bm WHERE bm.company_id = companies.id AND bm.user_id = auth.uid()
));

DROP POLICY IF EXISTS "members read members" ON public.company_members;
CREATE POLICY "members read members" ON public.company_members FOR SELECT TO authenticated
USING (public.is_company_member(company_id) OR user_id = auth.uid());

CREATE POLICY "company managers manage branches" ON public.branches FOR ALL TO authenticated
USING (public.is_company_admin(company_id))
WITH CHECK (public.is_company_admin(company_id));
CREATE POLICY "branch members read assigned branches" ON public.branches FOR SELECT TO authenticated
USING (public.is_branch_member(company_id, id));

CREATE POLICY "company owners manage branch memberships" ON public.branch_members FOR ALL TO authenticated
USING (public.is_company_owner(auth.uid(), company_id))
WITH CHECK (public.is_company_owner(auth.uid(), company_id));
CREATE POLICY "branch members read own branch roster" ON public.branch_members FOR SELECT TO authenticated
USING (public.is_company_member(company_id) OR public.is_branch_member(company_id, branch_id));

DROP POLICY IF EXISTS "members read" ON public.warehouses;
DROP POLICY IF EXISTS "editors insert" ON public.warehouses;
DROP POLICY IF EXISTS "editors update" ON public.warehouses;
DROP POLICY IF EXISTS "editors delete" ON public.warehouses;
CREATE POLICY "members read" ON public.warehouses FOR SELECT TO authenticated
USING (public.is_company_member(company_id) OR public.is_branch_member(company_id, branch_id));
CREATE POLICY "editors insert" ON public.warehouses FOR INSERT TO authenticated
WITH CHECK (public.can_edit_company(company_id) OR public.can_edit_branch(company_id, branch_id));
CREATE POLICY "editors update" ON public.warehouses FOR UPDATE TO authenticated
USING (public.can_edit_company(company_id) OR public.can_edit_branch(company_id, branch_id))
WITH CHECK (public.can_edit_company(company_id) OR public.can_edit_branch(company_id, branch_id));
CREATE POLICY "editors delete" ON public.warehouses FOR DELETE TO authenticated
USING (public.can_edit_company(company_id) OR public.can_edit_branch(company_id, branch_id));

DROP POLICY IF EXISTS "members read" ON public.inventory;
DROP POLICY IF EXISTS "editors insert" ON public.inventory;
DROP POLICY IF EXISTS "editors update" ON public.inventory;
DROP POLICY IF EXISTS "editors delete" ON public.inventory;
CREATE POLICY "members read" ON public.inventory FOR SELECT TO authenticated
USING (public.is_company_member(company_id) OR EXISTS (
  SELECT 1 FROM public.warehouses w
  WHERE w.id = inventory.warehouse_id AND w.company_id = inventory.company_id
    AND public.is_branch_member(w.company_id, w.branch_id)
));
CREATE POLICY "editors insert" ON public.inventory FOR INSERT TO authenticated
WITH CHECK (public.can_edit_company(company_id) OR EXISTS (
  SELECT 1 FROM public.warehouses w
  WHERE w.id = inventory.warehouse_id AND w.company_id = inventory.company_id
    AND public.can_edit_branch(w.company_id, w.branch_id)
));
CREATE POLICY "editors update" ON public.inventory FOR UPDATE TO authenticated
USING (public.can_edit_company(company_id) OR EXISTS (
  SELECT 1 FROM public.warehouses w WHERE w.id = inventory.warehouse_id AND w.company_id = inventory.company_id
    AND public.can_edit_branch(w.company_id, w.branch_id)
))
WITH CHECK (public.can_edit_company(company_id) OR EXISTS (
  SELECT 1 FROM public.warehouses w WHERE w.id = inventory.warehouse_id AND w.company_id = inventory.company_id
    AND public.can_edit_branch(w.company_id, w.branch_id)
));
CREATE POLICY "editors delete" ON public.inventory FOR DELETE TO authenticated
USING (public.can_edit_company(company_id) OR EXISTS (
  SELECT 1 FROM public.warehouses w WHERE w.id = inventory.warehouse_id AND w.company_id = inventory.company_id
    AND public.can_edit_branch(w.company_id, w.branch_id)
));

DROP POLICY IF EXISTS "members read" ON public.sales_history;
DROP POLICY IF EXISTS "editors insert" ON public.sales_history;
DROP POLICY IF EXISTS "editors update" ON public.sales_history;
DROP POLICY IF EXISTS "editors delete" ON public.sales_history;
CREATE POLICY "members read" ON public.sales_history FOR SELECT TO authenticated
USING (public.is_company_member(company_id) OR public.is_branch_member(company_id, branch_id));
CREATE POLICY "editors insert" ON public.sales_history FOR INSERT TO authenticated
WITH CHECK ((public.is_company_member(company_id) AND public.can_edit_company(company_id)) OR public.can_edit_branch(company_id, branch_id));
CREATE POLICY "editors update" ON public.sales_history FOR UPDATE TO authenticated
USING ((public.is_company_member(company_id) AND public.can_edit_company(company_id)) OR public.can_edit_branch(company_id, branch_id))
WITH CHECK ((public.is_company_member(company_id) AND public.can_edit_company(company_id)) OR public.can_edit_branch(company_id, branch_id));
CREATE POLICY "editors delete" ON public.sales_history FOR DELETE TO authenticated
USING ((public.is_company_member(company_id) AND public.can_edit_company(company_id)) OR public.can_edit_branch(company_id, branch_id));

DROP POLICY IF EXISTS "members read" ON public.purchase_orders;
DROP POLICY IF EXISTS "editors insert" ON public.purchase_orders;
DROP POLICY IF EXISTS "editors update" ON public.purchase_orders;
DROP POLICY IF EXISTS "editors delete" ON public.purchase_orders;
CREATE POLICY "members read" ON public.purchase_orders FOR SELECT TO authenticated
USING (public.is_company_member(company_id) OR public.is_branch_member(company_id, branch_id));
CREATE POLICY "editors insert" ON public.purchase_orders FOR INSERT TO authenticated
WITH CHECK ((public.is_company_member(company_id) AND public.can_edit_company(company_id)) OR public.can_edit_branch(company_id, branch_id));
CREATE POLICY "editors update" ON public.purchase_orders FOR UPDATE TO authenticated
USING ((public.is_company_member(company_id) AND public.can_edit_company(company_id)) OR public.can_edit_branch(company_id, branch_id))
WITH CHECK ((public.is_company_member(company_id) AND public.can_edit_company(company_id)) OR public.can_edit_branch(company_id, branch_id));
CREATE POLICY "editors delete" ON public.purchase_orders FOR DELETE TO authenticated
USING ((public.is_company_member(company_id) AND public.can_edit_company(company_id)) OR public.can_edit_branch(company_id, branch_id));

DROP POLICY IF EXISTS "members read" ON public.po_items;
DROP POLICY IF EXISTS "editors insert" ON public.po_items;
DROP POLICY IF EXISTS "editors update" ON public.po_items;
DROP POLICY IF EXISTS "editors delete" ON public.po_items;
CREATE POLICY "members read" ON public.po_items FOR SELECT TO authenticated
USING (public.is_company_member(company_id) OR EXISTS (
  SELECT 1 FROM public.purchase_orders po WHERE po.id = po_items.po_id AND po.company_id = po_items.company_id
    AND public.is_branch_member(po.company_id, po.branch_id)
));
CREATE POLICY "editors insert" ON public.po_items FOR INSERT TO authenticated
WITH CHECK ((public.is_company_member(company_id) AND public.can_edit_company(company_id)) OR EXISTS (
  SELECT 1 FROM public.purchase_orders po WHERE po.id = po_items.po_id AND po.company_id = po_items.company_id
    AND public.can_edit_branch(po.company_id, po.branch_id)
));
CREATE POLICY "editors update" ON public.po_items FOR UPDATE TO authenticated
USING ((public.is_company_member(company_id) AND public.can_edit_company(company_id)) OR EXISTS (
  SELECT 1 FROM public.purchase_orders po WHERE po.id = po_items.po_id AND po.company_id = po_items.company_id
    AND public.can_edit_branch(po.company_id, po.branch_id)
))
WITH CHECK ((public.is_company_member(company_id) AND public.can_edit_company(company_id)) OR EXISTS (
  SELECT 1 FROM public.purchase_orders po WHERE po.id = po_items.po_id AND po.company_id = po_items.company_id
    AND public.can_edit_branch(po.company_id, po.branch_id)
));
CREATE POLICY "editors delete" ON public.po_items FOR DELETE TO authenticated
USING ((public.is_company_member(company_id) AND public.can_edit_company(company_id)) OR EXISTS (
  SELECT 1 FROM public.purchase_orders po WHERE po.id = po_items.po_id AND po.company_id = po_items.company_id
    AND public.can_edit_branch(po.company_id, po.branch_id)
));

DROP POLICY IF EXISTS "members read audit" ON public.audit_log;
CREATE POLICY "members read audit" ON public.audit_log FOR SELECT TO authenticated
USING (public.is_company_member(company_id) OR public.is_branch_member(company_id, branch_id));

CREATE OR REPLACE FUNCTION public.write_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; label text; branch uuid;
BEGIN
  r := CASE WHEN tg_op = 'DELETE' THEN old ELSE new END;
  label := CASE tg_table_name
    WHEN 'products' THEN r.name || ' (' || r.sku || ')'
    WHEN 'suppliers' THEN r.name
    WHEN 'warehouses' THEN r.name
    WHEN 'purchase_orders' THEN r.po_number || coalesce(' → ' || r.status::text, '')
    ELSE NULL END;
  IF tg_table_name = 'inventory' THEN
    SELECT p.name || ': ' || coalesce(old.quantity::text, '0') || ' → ' || coalesce(new.quantity::text, '0'), w.branch_id
      INTO label, branch FROM public.products p JOIN public.warehouses w ON w.id = r.warehouse_id WHERE p.id = r.product_id;
  ELSIF tg_table_name = 'warehouses' THEN
    branch := r.branch_id;
  ELSIF tg_table_name = 'purchase_orders' THEN
    branch := r.branch_id;
  END IF;
  IF tg_op = 'UPDATE' AND tg_table_name = 'inventory' AND old.quantity = new.quantity THEN RETURN NULL; END IF;
  INSERT INTO public.audit_log(company_id, branch_id, actor_id, actor_email, action, entity, entity_id, summary)
  VALUES (r.company_id, branch, auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()), lower(tg_op), tg_table_name, r.id, label);
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.receive_purchase_order(_po uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE po record;
BEGIN
  SELECT * INTO po FROM public.purchase_orders WHERE id = _po FOR UPDATE;
  IF po IS NULL THEN RAISE EXCEPTION 'Purchase order not found'; END IF;
  IF NOT (public.can_edit_company(po.company_id) OR public.can_edit_branch(po.company_id, po.branch_id)) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF po.status <> 'approved' THEN RAISE EXCEPTION 'Only approved orders can be received'; END IF;
  IF po.warehouse_id IS NULL THEN RAISE EXCEPTION 'Choose a receiving warehouse first'; END IF;
  IF po.branch_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.warehouses w WHERE w.id = po.warehouse_id AND w.company_id = po.company_id AND w.branch_id = po.branch_id
  ) THEN RAISE EXCEPTION 'Receiving warehouse must belong to the purchase order branch'; END IF;
  INSERT INTO public.inventory(company_id, product_id, warehouse_id, quantity, updated_at)
  SELECT po.company_id, i.product_id, po.warehouse_id, sum(i.quantity), now()
  FROM public.po_items i WHERE i.po_id = _po GROUP BY i.product_id
  ON CONFLICT (product_id, warehouse_id) DO UPDATE SET quantity = inventory.quantity + excluded.quantity, updated_at = now();
  UPDATE public.purchase_orders SET status = 'received', received_at = now() WHERE id = _po;
END $$;

CREATE OR REPLACE FUNCTION public.claim_invite(_token uuid, _email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv public.team_invites%rowtype; uid uuid := auth.uid(); full_name text; account_email text;
BEGIN
  IF uid IS NULL THEN RETURN 'unauthenticated'; END IF;
  SELECT * INTO inv FROM public.team_invites WHERE token = _token AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RETURN 'invalid'; END IF;
  IF inv.expires_at < now() THEN RETURN 'expired'; END IF;
  SELECT email, coalesce(raw_user_meta_data->>'full_name', '') INTO account_email, full_name FROM auth.users WHERE id = uid;
  IF account_email IS NULL OR lower(inv.email) <> lower(_email) OR lower(inv.email) <> lower(account_email) THEN RETURN 'wrong_account'; END IF;
  IF inv.role = 'owner' AND NOT public.is_company_owner(inv.invited_by, inv.company_id) THEN RETURN 'invalid'; END IF;
  INSERT INTO public.company_members(company_id, user_id, role, full_name)
  VALUES (inv.company_id, uid, inv.role, nullif(full_name, '')) ON CONFLICT (company_id, user_id) DO NOTHING;
  UPDATE public.team_invites SET status = 'accepted' WHERE id = inv.id;
  RETURN 'ok';
END $$;
REVOKE EXECUTE ON FUNCTION public.claim_invite(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.claim_invite(uuid, text) TO authenticated;

CREATE POLICY "company logo read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'company-logos' AND EXISTS (
  SELECT 1 FROM public.companies c
  WHERE c.id::text = (storage.foldername(name))[1]
    AND (public.is_company_member(c.id) OR EXISTS (
      SELECT 1 FROM public.branch_members bm WHERE bm.company_id = c.id AND bm.user_id = auth.uid()
    ))
));
CREATE POLICY "company admins manage logo" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'company-logos' AND EXISTS (
  SELECT 1 FROM public.companies c WHERE c.id::text = (storage.foldername(name))[1] AND public.is_company_admin(c.id)
))
WITH CHECK (bucket_id = 'company-logos' AND EXISTS (
  SELECT 1 FROM public.companies c WHERE c.id::text = (storage.foldername(name))[1] AND public.is_company_admin(c.id)
));