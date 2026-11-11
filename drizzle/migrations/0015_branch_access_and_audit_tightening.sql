DROP POLICY IF EXISTS "company managers manage branches" ON public.branches;
CREATE POLICY "company owners manage branches" ON public.branches FOR ALL TO authenticated
USING (public.is_company_owner(auth.uid(), company_id))
WITH CHECK (public.is_company_owner(auth.uid(), company_id));

DROP POLICY IF EXISTS "branch managers manage employees" ON public.employees;
CREATE POLICY "branch owners and admins manage employees" ON public.employees FOR INSERT TO authenticated
WITH CHECK (public.is_company_owner(auth.uid(), company_id) OR EXISTS (
  SELECT 1 FROM public.branch_members bm WHERE bm.company_id = employees.company_id AND bm.branch_id = employees.branch_id
    AND bm.user_id = auth.uid() AND bm.role = 'admin'::public.branch_access_role
));
DROP POLICY IF EXISTS "branch managers update employees" ON public.employees;
CREATE POLICY "branch owners and admins update employees" ON public.employees FOR UPDATE TO authenticated
USING (public.is_company_owner(auth.uid(), company_id) OR EXISTS (
  SELECT 1 FROM public.branch_members bm WHERE bm.company_id = employees.company_id AND bm.branch_id = employees.branch_id
    AND bm.user_id = auth.uid() AND bm.role = 'admin'::public.branch_access_role
))
WITH CHECK (public.is_company_owner(auth.uid(), company_id) OR EXISTS (
  SELECT 1 FROM public.branch_members bm WHERE bm.company_id = employees.company_id AND bm.branch_id = employees.branch_id
    AND bm.user_id = auth.uid() AND bm.role = 'admin'::public.branch_access_role
));
DROP POLICY IF EXISTS "branch managers delete employees" ON public.employees;
CREATE POLICY "branch owners and admins delete employees" ON public.employees FOR DELETE TO authenticated
USING (public.is_company_owner(auth.uid(), company_id) OR EXISTS (
  SELECT 1 FROM public.branch_members bm WHERE bm.company_id = employees.company_id AND bm.branch_id = employees.branch_id
    AND bm.user_id = auth.uid() AND bm.role = 'admin'::public.branch_access_role
));

DROP POLICY IF EXISTS "own threads" ON public.chat_threads;
CREATE POLICY "own threads" ON public.chat_threads FOR ALL TO authenticated
USING ((public.is_company_member(company_id) OR EXISTS (SELECT 1 FROM public.branch_members bm WHERE bm.company_id = chat_threads.company_id AND bm.user_id = auth.uid())) AND user_id = auth.uid())
WITH CHECK ((public.is_company_member(company_id) OR EXISTS (SELECT 1 FROM public.branch_members bm WHERE bm.company_id = chat_threads.company_id AND bm.user_id = auth.uid())) AND user_id = auth.uid());
DROP POLICY IF EXISTS "own messages" ON public.chat_messages;
CREATE POLICY "own messages" ON public.chat_messages FOR ALL TO authenticated
USING (
  (public.is_company_member(company_id) OR EXISTS (SELECT 1 FROM public.branch_members bm WHERE bm.company_id = chat_messages.company_id AND bm.user_id = auth.uid()))
  AND user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = chat_messages.thread_id AND t.company_id = chat_messages.company_id AND t.user_id = auth.uid())
)
WITH CHECK (
  (public.is_company_member(company_id) OR EXISTS (SELECT 1 FROM public.branch_members bm WHERE bm.company_id = chat_messages.company_id AND bm.user_id = auth.uid()))
  AND user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = chat_messages.thread_id AND t.company_id = chat_messages.company_id AND t.user_id = auth.uid())
);

CREATE OR REPLACE FUNCTION public.can_manage_branch_people(_company uuid, _branch uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_company_owner(auth.uid(), _company) OR EXISTS (
    SELECT 1 FROM public.branch_members bm
    WHERE bm.company_id = _company AND bm.branch_id = _branch AND bm.user_id = auth.uid()
      AND bm.role = 'admin'::public.branch_access_role
  )
$$;

CREATE OR REPLACE FUNCTION public.set_employee_compensation(
  _employee uuid, _basic numeric, _allowances numeric, _bonuses numeric, _deductions numeric, _effective_from date
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.employees%rowtype; prior_from date; compensation_id uuid;
BEGIN
  SELECT * INTO e FROM public.employees WHERE id = _employee;
  IF NOT FOUND OR NOT public.can_manage_branch_people(e.company_id, e.branch_id) THEN RAISE EXCEPTION 'Not allowed to update compensation for this employee'; END IF;
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

CREATE OR REPLACE FUNCTION public.generate_branch_payroll(_branch uuid, _period date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE branch_row public.branches%rowtype; inserted_count integer;
BEGIN
  SELECT * INTO branch_row FROM public.branches WHERE id = _branch AND status = 'active';
  IF NOT FOUND OR NOT public.can_manage_branch_people(branch_row.company_id, branch_row.id) THEN RAISE EXCEPTION 'Not allowed to generate payroll for this branch'; END IF;
  IF _period <> date_trunc('month', _period)::date THEN RAISE EXCEPTION 'Salary period must be the first day of a month'; END IF;
  INSERT INTO public.payroll_records(company_id, branch_id, employee_id, salary_period, basic_salary, allowances, bonuses, deductions, created_by)
  SELECT e.company_id, e.branch_id, e.id, _period, c.basic_salary, c.allowances, c.bonuses, c.deductions, auth.uid()
  FROM public.employees e
  JOIN LATERAL (
    SELECT ec.basic_salary, ec.allowances, ec.bonuses, ec.deductions FROM public.employee_compensation ec
    WHERE ec.employee_id = e.id AND ec.effective_from <= _period AND (ec.effective_to IS NULL OR ec.effective_to >= _period)
    ORDER BY ec.effective_from DESC LIMIT 1
  ) c ON true
  WHERE e.company_id = branch_row.company_id AND e.branch_id = branch_row.id AND e.employment_status = 'active'
  ON CONFLICT (employee_id, salary_period) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END $$;
REVOKE EXECUTE ON FUNCTION public.generate_branch_payroll(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_branch_payroll(uuid, date) TO authenticated;