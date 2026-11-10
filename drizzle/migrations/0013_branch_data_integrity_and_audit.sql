ALTER TABLE public.products ADD CONSTRAINT products_id_company_unique UNIQUE (id, company_id);
ALTER TABLE public.suppliers ADD CONSTRAINT suppliers_id_company_unique UNIQUE (id, company_id);
ALTER TABLE public.warehouses ADD CONSTRAINT warehouses_id_company_unique UNIQUE (id, company_id);
ALTER TABLE public.purchase_orders ADD CONSTRAINT purchase_orders_id_company_unique UNIQUE (id, company_id);
ALTER TABLE public.sales_transactions ADD CONSTRAINT sales_transactions_id_company_branch_unique UNIQUE (id, company_id, branch_id);

ALTER TABLE public.products ADD CONSTRAINT products_supplier_company_fkey
  FOREIGN KEY (supplier_id, company_id) REFERENCES public.suppliers(id, company_id) ON DELETE SET NULL (supplier_id);
ALTER TABLE public.inventory ADD CONSTRAINT inventory_product_company_fkey
  FOREIGN KEY (product_id, company_id) REFERENCES public.products(id, company_id) ON DELETE CASCADE;
ALTER TABLE public.inventory ADD CONSTRAINT inventory_warehouse_company_fkey
  FOREIGN KEY (warehouse_id, company_id) REFERENCES public.warehouses(id, company_id) ON DELETE CASCADE;
ALTER TABLE public.sales_history ADD CONSTRAINT sales_history_product_company_fkey
  FOREIGN KEY (product_id, company_id) REFERENCES public.products(id, company_id) ON DELETE CASCADE;
ALTER TABLE public.purchase_orders ADD CONSTRAINT purchase_orders_supplier_company_fkey
  FOREIGN KEY (supplier_id, company_id) REFERENCES public.suppliers(id, company_id) ON DELETE SET NULL (supplier_id);
ALTER TABLE public.purchase_orders ADD CONSTRAINT purchase_orders_warehouse_company_fkey
  FOREIGN KEY (warehouse_id, company_id) REFERENCES public.warehouses(id, company_id) ON DELETE SET NULL (warehouse_id);
ALTER TABLE public.po_items ADD CONSTRAINT po_items_order_company_fkey
  FOREIGN KEY (po_id, company_id) REFERENCES public.purchase_orders(id, company_id) ON DELETE CASCADE;
ALTER TABLE public.po_items ADD CONSTRAINT po_items_product_company_fkey
  FOREIGN KEY (product_id, company_id) REFERENCES public.products(id, company_id) ON DELETE RESTRICT;
ALTER TABLE public.sales_transaction_items ADD CONSTRAINT sales_transaction_items_transaction_company_branch_fkey
  FOREIGN KEY (transaction_id, company_id, branch_id) REFERENCES public.sales_transactions(id, company_id, branch_id) ON DELETE RESTRICT;
ALTER TABLE public.sales_transaction_items ADD CONSTRAINT sales_transaction_items_product_company_fkey
  FOREIGN KEY (product_id, company_id) REFERENCES public.products(id, company_id) ON DELETE RESTRICT;
ALTER TABLE public.sales_transaction_items ADD CONSTRAINT sales_transaction_items_warehouse_company_fkey
  FOREIGN KEY (warehouse_id, company_id) REFERENCES public.warehouses(id, company_id) ON DELETE RESTRICT;

CREATE POLICY "branch members read shared products" ON public.products FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.branch_members bm WHERE bm.company_id = products.company_id AND bm.user_id = auth.uid()));
CREATE POLICY "branch members read shared suppliers" ON public.suppliers FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.branch_members bm WHERE bm.company_id = suppliers.company_id AND bm.user_id = auth.uid()));

DROP POLICY IF EXISTS "authorized payroll managers access compensation" ON public.employee_compensation;
CREATE POLICY "authorized payroll managers read compensation" ON public.employee_compensation FOR SELECT TO authenticated
USING (public.is_branch_admin(company_id, branch_id));

CREATE OR REPLACE FUNCTION public.set_employee_compensation(
  _employee uuid, _basic numeric, _allowances numeric, _bonuses numeric, _deductions numeric, _effective_from date
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.employees%rowtype; prior_from date; compensation_id uuid;
BEGIN
  SELECT * INTO e FROM public.employees WHERE id = _employee;
  IF NOT FOUND OR NOT public.is_branch_admin(e.company_id, e.branch_id) THEN RAISE EXCEPTION 'Not allowed to update compensation for this employee'; END IF;
  IF _basic < 0 OR _allowances < 0 OR _bonuses < 0 OR _deductions < 0 THEN RAISE EXCEPTION 'Compensation amounts cannot be negative'; END IF;
  SELECT max(effective_from) INTO prior_from FROM public.employee_compensation WHERE employee_id = e.id;
  IF prior_from IS NOT NULL AND _effective_from <= prior_from THEN RAISE EXCEPTION 'New compensation must start after the previous compensation period'; END IF;
  UPDATE public.employee_compensation SET effective_to = _effective_from - 1 WHERE employee_id = e.id AND effective_to IS NULL;
  INSERT INTO public.employee_compensation(company_id, branch_id, employee_id, basic_salary, allowances, bonuses, deductions, effective_from)
  VALUES (e.company_id, e.branch_id, e.id, _basic, _allowances, _bonuses, _deductions, _effective_from)
  RETURNING id INTO compensation_id;
  RETURN compensation_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.set_employee_compensation(uuid, numeric, numeric, numeric, numeric, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_employee_compensation(uuid, numeric, numeric, numeric, numeric, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_compensation_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Compensation history cannot be deleted'; END IF;
  IF NEW.id <> OLD.id OR NEW.company_id <> OLD.company_id OR NEW.branch_id <> OLD.branch_id OR NEW.employee_id <> OLD.employee_id OR
     NEW.basic_salary <> OLD.basic_salary OR NEW.allowances <> OLD.allowances OR NEW.bonuses <> OLD.bonuses OR NEW.deductions <> OLD.deductions OR
     NEW.effective_from <> OLD.effective_from OR NEW.created_at <> OLD.created_at OR OLD.effective_to IS NOT NULL OR NEW.effective_to IS NULL OR
     NEW.effective_to < OLD.effective_from THEN
    RAISE EXCEPTION 'Compensation history is immutable except for closing its effective period';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER compensation_history_guard BEFORE UPDATE OR DELETE ON public.employee_compensation
FOR EACH ROW EXECUTE FUNCTION public.guard_compensation_history();

ALTER TABLE public.payroll_records ADD CONSTRAINT payroll_manual_payment_record CHECK (manually_recorded IS TRUE);
ALTER TABLE public.payroll_records ADD CONSTRAINT payroll_paid_requires_date CHECK (payment_status <> 'paid' OR payment_date IS NOT NULL);

CREATE OR REPLACE FUNCTION public.guard_payroll_record()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.manually_recorded IS NOT TRUE THEN RAISE EXCEPTION 'Payment records must be identified as manually recorded'; END IF;
  IF NEW.payment_status = 'paid' AND NEW.payment_date IS NULL THEN RAISE EXCEPTION 'A payment date is required when recording a paid salary'; END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.id <> OLD.id OR NEW.company_id <> OLD.company_id OR NEW.branch_id <> OLD.branch_id OR NEW.employee_id <> OLD.employee_id OR
    NEW.salary_period <> OLD.salary_period OR NEW.basic_salary <> OLD.basic_salary OR NEW.allowances <> OLD.allowances OR
    NEW.bonuses <> OLD.bonuses OR NEW.deductions <> OLD.deductions OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at <> OLD.created_at
  ) THEN RAISE EXCEPTION 'Generated payroll amounts and identity cannot be edited'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.assert_member_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _company uuid := coalesce(NEW.company_id, OLD.company_id);
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id <> OLD.id OR NEW.company_id <> OLD.company_id OR NEW.user_id <> OLD.user_id THEN
      RAISE EXCEPTION 'Workspace member identity cannot be changed';
    END IF;
    IF NEW.branch_scoped AND NEW.role <> 'viewer'::public.company_role THEN
      RAISE EXCEPTION 'Branch-scoped users must retain the workspace viewer role';
    END IF;
    IF (NEW.branch_scoped <> OLD.branch_scoped OR ((NEW.branch_scoped OR OLD.branch_scoped) AND NEW.role <> OLD.role))
       AND NOT public.is_company_owner(auth.uid(), _company) THEN
      RAISE EXCEPTION 'Only an Owner can change branch-scoped workspace access';
    END IF;
    IF NEW.role <> OLD.role AND (NEW.role = 'owner'::public.company_role OR OLD.role = 'owner'::public.company_role)
       AND NOT public.is_company_owner(auth.uid(), _company) THEN
      RAISE EXCEPTION 'Only an Owner can change an Owner role';
    END IF;
    IF OLD.role = 'owner'::public.company_role AND NEW.role <> 'owner'::public.company_role AND public.count_owners(_company) <= 1 THEN
      RAISE EXCEPTION 'A workspace must keep at least one Owner';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' AND OLD.role = 'owner'::public.company_role THEN
    IF NOT public.is_company_owner(auth.uid(), OLD.company_id) THEN RAISE EXCEPTION 'Only an Owner can remove an Owner'; END IF;
    IF public.count_owners(OLD.company_id) <= 1 THEN RAISE EXCEPTION 'A workspace must keep at least one Owner'; END IF;
  END IF;
  RETURN coalesce(NEW, OLD);
END $$;

CREATE OR REPLACE FUNCTION public.guard_branch_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.company_members cm WHERE cm.company_id = NEW.company_id AND cm.user_id = NEW.user_id
      AND cm.branch_scoped AND cm.role = 'viewer'::public.company_role
  ) THEN RAISE EXCEPTION 'Branch members must have a branch-scoped workspace account'; END IF;
  IF TG_OP = 'UPDATE' AND (NEW.id <> OLD.id OR NEW.company_id <> OLD.company_id OR NEW.branch_id <> OLD.branch_id OR NEW.user_id <> OLD.user_id) THEN
    RAISE EXCEPTION 'Branch member identity cannot be changed';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER branch_member_assignment_guard BEFORE INSERT OR UPDATE ON public.branch_members
FOR EACH ROW EXECUTE FUNCTION public.guard_branch_assignment();

CREATE OR REPLACE FUNCTION public.guard_purchase_order_branch()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.branch_id IS NOT NULL AND NEW.warehouse_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.warehouses w WHERE w.id = NEW.warehouse_id AND w.company_id = NEW.company_id AND w.branch_id = NEW.branch_id
  ) THEN RAISE EXCEPTION 'Purchase order warehouse must belong to its branch'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER purchase_order_branch_guard BEFORE INSERT OR UPDATE OF branch_id, warehouse_id, company_id ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.guard_purchase_order_branch();

CREATE OR REPLACE FUNCTION public.write_people_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; target_branch uuid; entity_name text; action_name text; safe_summary text;
BEGIN
  r := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  entity_name := TG_TABLE_NAME;
  action_name := lower(TG_OP);
  target_branch := CASE WHEN TG_TABLE_NAME = 'branches' THEN r.id ELSE r.branch_id END;
  safe_summary := CASE TG_TABLE_NAME
    WHEN 'branches' THEN 'Branch ' || r.name
    WHEN 'branch_members' THEN 'Branch access assignment updated'
    WHEN 'employees' THEN 'Employee record ' || coalesce(r.employee_code, '')
    WHEN 'employee_compensation' THEN 'Compensation history updated'
    WHEN 'payroll_records' THEN 'Payroll record ' || r.salary_period::text || ' ' || lower(r.payment_status)
    WHEN 'sales_transactions' THEN 'Branch sale recorded'
    ELSE 'Business activity recorded' END;
  INSERT INTO public.audit_log(company_id, branch_id, actor_id, actor_email, action, entity, entity_id, summary)
  VALUES (r.company_id, target_branch, auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()), action_name, entity_name, r.id, safe_summary);
  RETURN NULL;
END $$;
CREATE TRIGGER audit_branches AFTER INSERT OR UPDATE OR DELETE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.write_people_audit();
CREATE TRIGGER audit_branch_members AFTER INSERT OR UPDATE OR DELETE ON public.branch_members FOR EACH ROW EXECUTE FUNCTION public.write_people_audit();
CREATE TRIGGER audit_employees AFTER INSERT OR UPDATE OR DELETE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.write_people_audit();
CREATE TRIGGER audit_employee_compensation AFTER INSERT OR UPDATE OR DELETE ON public.employee_compensation FOR EACH ROW EXECUTE FUNCTION public.write_people_audit();
CREATE TRIGGER audit_payroll_records AFTER INSERT OR UPDATE OR DELETE ON public.payroll_records FOR EACH ROW EXECUTE FUNCTION public.write_people_audit();
CREATE TRIGGER audit_sales_transactions AFTER INSERT OR UPDATE OR DELETE ON public.sales_transactions FOR EACH ROW EXECUTE FUNCTION public.write_people_audit();

CREATE OR REPLACE FUNCTION public.write_company_profile_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.name, NEW.business_type, NEW.country, NEW.company_email, NEW.phone, NEW.address, NEW.city, NEW.website, NEW.tax_id, NEW.registration_number, NEW.logo_path)
     IS DISTINCT FROM
     (OLD.name, OLD.business_type, OLD.country, OLD.company_email, OLD.phone, OLD.address, OLD.city, OLD.website, OLD.tax_id, OLD.registration_number, OLD.logo_path) THEN
    INSERT INTO public.audit_log(company_id, actor_id, actor_email, action, entity, entity_id, summary)
    VALUES (NEW.id, auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()), 'update', 'company_profile', NEW.id, 'Company profile updated');
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER audit_company_profile AFTER UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.write_company_profile_audit();

CREATE OR REPLACE FUNCTION public.branch_invite_preview(_token uuid)
RETURNS TABLE(company_name text, invited_email text, branch_name text, invited_branch_role public.branch_access_role, expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.name, i.email, b.name, i.branch_role, i.expires_at
  FROM public.team_invites i JOIN public.companies c ON c.id = i.company_id
  JOIN public.branches b ON b.id = i.branch_id AND b.company_id = i.company_id
  WHERE i.token = _token AND i.branch_id IS NOT NULL AND i.status = 'pending' AND i.expires_at > now()
$$;
GRANT EXECUTE ON FUNCTION public.branch_invite_preview(uuid) TO anon, authenticated;