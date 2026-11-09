CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL,
  user_id uuid,
  employee_code text NOT NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  gender text,
  address text,
  department text,
  designation text,
  joining_date date,
  employment_type text NOT NULL DEFAULT 'full_time',
  employment_status text NOT NULL DEFAULT 'active' CHECK (employment_status IN ('active', 'inactive', 'on_leave')),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (branch_id, company_id) REFERENCES public.branches(id, company_id) ON DELETE RESTRICT,
  UNIQUE (company_id, employee_code),
  UNIQUE (id, company_id, branch_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE INDEX employees_company_branch_status_idx ON public.employees(company_id, branch_id, employment_status);
CREATE POLICY "branch team read employees" ON public.employees FOR SELECT TO authenticated
USING (public.is_company_member(company_id) OR public.is_branch_member(company_id, branch_id));
CREATE POLICY "branch managers manage employees" ON public.employees FOR INSERT TO authenticated
WITH CHECK (public.is_company_admin(company_id) OR public.can_edit_branch(company_id, branch_id));
CREATE POLICY "branch managers update employees" ON public.employees FOR UPDATE TO authenticated
USING (public.is_company_admin(company_id) OR public.can_edit_branch(company_id, branch_id))
WITH CHECK (public.is_company_admin(company_id) OR public.can_edit_branch(company_id, branch_id));
CREATE POLICY "branch managers delete employees" ON public.employees FOR DELETE TO authenticated
USING (public.is_company_admin(company_id) OR public.can_edit_branch(company_id, branch_id));

CREATE TABLE public.employee_compensation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  basic_salary numeric(14,2) NOT NULL DEFAULT 0,
  allowances numeric(14,2) NOT NULL DEFAULT 0,
  bonuses numeric(14,2) NOT NULL DEFAULT 0,
  deductions numeric(14,2) NOT NULL DEFAULT 0,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (employee_id, company_id, branch_id) REFERENCES public.employees(id, company_id, branch_id) ON DELETE RESTRICT,
  CHECK (basic_salary >= 0 AND allowances >= 0 AND bonuses >= 0 AND deductions >= 0),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_compensation TO authenticated;
GRANT ALL ON public.employee_compensation TO service_role;
ALTER TABLE public.employee_compensation ENABLE ROW LEVEL SECURITY;
CREATE INDEX employee_compensation_employee_period_idx ON public.employee_compensation(employee_id, effective_from DESC);
CREATE POLICY "authorized payroll managers access compensation" ON public.employee_compensation FOR ALL TO authenticated
USING (public.is_branch_admin(company_id, branch_id))
WITH CHECK (public.is_branch_admin(company_id, branch_id));

CREATE TABLE public.payroll_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  salary_period date NOT NULL,
  basic_salary numeric(14,2) NOT NULL,
  allowances numeric(14,2) NOT NULL DEFAULT 0,
  bonuses numeric(14,2) NOT NULL DEFAULT 0,
  deductions numeric(14,2) NOT NULL DEFAULT 0,
  net_salary numeric(14,2) GENERATED ALWAYS AS (basic_salary + allowances + bonuses - deductions) STORED,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'processing')),
  payment_date date,
  payment_method text,
  transaction_reference text,
  manually_recorded boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (employee_id, company_id, branch_id) REFERENCES public.employees(id, company_id, branch_id) ON DELETE RESTRICT,
  CHECK (date_trunc('month', salary_period)::date = salary_period),
  CHECK (basic_salary >= 0 AND allowances >= 0 AND bonuses >= 0 AND deductions >= 0),
  UNIQUE (employee_id, salary_period)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_records TO authenticated;
GRANT ALL ON public.payroll_records TO service_role;
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
CREATE INDEX payroll_records_company_branch_period_idx ON public.payroll_records(company_id, branch_id, salary_period DESC);
CREATE POLICY "authorized payroll managers access records" ON public.payroll_records FOR ALL TO authenticated
USING (public.is_branch_admin(company_id, branch_id))
WITH CHECK (public.is_branch_admin(company_id, branch_id));

CREATE TABLE public.sales_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (branch_id, company_id) REFERENCES public.branches(id, company_id) ON DELETE RESTRICT
);
GRANT SELECT ON public.sales_transactions TO authenticated;
GRANT ALL ON public.sales_transactions TO service_role;
ALTER TABLE public.sales_transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX sales_transactions_company_branch_date_idx ON public.sales_transactions(company_id, branch_id, transaction_date DESC);
CREATE POLICY "branch members read sales transactions" ON public.sales_transactions FOR SELECT TO authenticated
USING (public.is_company_member(company_id) OR public.is_branch_member(company_id, branch_id));

CREATE TABLE public.sales_transaction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.sales_transactions(id) ON DELETE RESTRICT,
  company_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(14,2) NOT NULL CHECK (unit_price >= 0),
  unit_cost numeric(14,2) NOT NULL CHECK (unit_cost >= 0),
  line_total numeric(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  FOREIGN KEY (branch_id, company_id) REFERENCES public.branches(id, company_id) ON DELETE RESTRICT
);
GRANT SELECT ON public.sales_transaction_items TO authenticated;
GRANT ALL ON public.sales_transaction_items TO service_role;
ALTER TABLE public.sales_transaction_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX sales_transaction_items_transaction_idx ON public.sales_transaction_items(transaction_id);
CREATE POLICY "branch members read sales transaction lines" ON public.sales_transaction_items FOR SELECT TO authenticated
USING (public.is_company_member(company_id) OR public.is_branch_member(company_id, branch_id));

CREATE OR REPLACE FUNCTION public.record_branch_sale(_branch uuid, _items jsonb, _transaction_date date DEFAULT CURRENT_DATE)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  branch_row public.branches%rowtype;
  sale_id uuid;
  item jsonb;
  prod public.products%rowtype;
  wh public.warehouses%rowtype;
  qty integer;
  total numeric(14,2) := 0;
BEGIN
  SELECT * INTO branch_row FROM public.branches WHERE id = _branch AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Active branch not found'; END IF;
  IF NOT public.can_edit_branch(branch_row.company_id, branch_row.id) THEN RAISE EXCEPTION 'Not allowed to record sales for this branch'; END IF;
  IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 OR jsonb_array_length(_items) > 100 THEN
    RAISE EXCEPTION 'Provide between 1 and 100 sale items';
  END IF;
  INSERT INTO public.sales_transactions(company_id, branch_id, transaction_date, created_by)
  VALUES (branch_row.company_id, branch_row.id, coalesce(_transaction_date, CURRENT_DATE), auth.uid()) RETURNING id INTO sale_id;
  FOR item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO prod FROM public.products WHERE id = (item->>'product_id')::uuid AND company_id = branch_row.company_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product not found in this company'; END IF;
    SELECT * INTO wh FROM public.warehouses WHERE id = (item->>'warehouse_id')::uuid AND company_id = branch_row.company_id AND branch_id = branch_row.id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Warehouse must belong to this branch'; END IF;
    qty := (item->>'quantity')::integer;
    IF qty IS NULL OR qty <= 0 THEN RAISE EXCEPTION 'Sale quantities must be positive'; END IF;
    UPDATE public.inventory SET quantity = quantity - qty, updated_at = now()
    WHERE product_id = prod.id AND warehouse_id = wh.id AND company_id = branch_row.company_id AND quantity >= qty;
    IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient stock at the selected warehouse'; END IF;
    INSERT INTO public.sales_transaction_items(transaction_id, company_id, branch_id, product_id, warehouse_id, quantity, unit_price, unit_cost)
    VALUES (sale_id, branch_row.company_id, branch_row.id, prod.id, wh.id, qty, prod.sell_price, prod.unit_cost);
    INSERT INTO public.sales_history(company_id, branch_id, product_id, sale_date, quantity)
    VALUES (branch_row.company_id, branch_row.id, prod.id, coalesce(_transaction_date, CURRENT_DATE), qty);
    total := total + qty * prod.sell_price;
  END LOOP;
  UPDATE public.sales_transactions SET total_amount = total WHERE id = sale_id;
  RETURN sale_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.record_branch_sale(uuid, jsonb, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_branch_sale(uuid, jsonb, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.generate_branch_payroll(_branch uuid, _period date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  branch_row public.branches%rowtype;
  inserted_count integer;
BEGIN
  SELECT * INTO branch_row FROM public.branches WHERE id = _branch AND status = 'active';
  IF NOT FOUND OR NOT public.is_branch_admin(branch_row.company_id, branch_row.id) THEN RAISE EXCEPTION 'Not allowed to generate payroll for this branch'; END IF;
  IF _period <> date_trunc('month', _period)::date THEN RAISE EXCEPTION 'Salary period must be the first day of a month'; END IF;
  INSERT INTO public.payroll_records(company_id, branch_id, employee_id, salary_period, basic_salary, allowances, bonuses, deductions, created_by)
  SELECT e.company_id, e.branch_id, e.id, _period, c.basic_salary, c.allowances, c.bonuses, c.deductions, auth.uid()
  FROM public.employees e
  JOIN LATERAL (
    SELECT ec.basic_salary, ec.allowances, ec.bonuses, ec.deductions
    FROM public.employee_compensation ec
    WHERE ec.employee_id = e.id AND ec.effective_from <= _period
      AND (ec.effective_to IS NULL OR ec.effective_to >= _period)
    ORDER BY ec.effective_from DESC LIMIT 1
  ) c ON true
  WHERE e.company_id = branch_row.company_id AND e.branch_id = branch_row.id AND e.employment_status = 'active'
  ON CONFLICT (employee_id, salary_period) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END $$;
REVOKE EXECUTE ON FUNCTION public.generate_branch_payroll(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_branch_payroll(uuid, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_payroll_record()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW.id <> OLD.id OR NEW.company_id <> OLD.company_id OR NEW.branch_id <> OLD.branch_id OR
    NEW.employee_id <> OLD.employee_id OR NEW.salary_period <> OLD.salary_period OR
    NEW.basic_salary <> OLD.basic_salary OR NEW.allowances <> OLD.allowances OR
    NEW.bonuses <> OLD.bonuses OR NEW.deductions <> OLD.deductions OR
    NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at <> OLD.created_at
  ) THEN
    RAISE EXCEPTION 'Generated payroll amounts and identity cannot be edited; use a compensation adjustment or a new payroll record';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER payroll_amounts_immutable BEFORE UPDATE ON public.payroll_records
FOR EACH ROW EXECUTE FUNCTION public.guard_payroll_record();