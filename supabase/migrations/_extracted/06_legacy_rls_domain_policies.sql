-- Domain-aware role helpers
CREATE OR REPLACE FUNCTION private.is_inventory_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(private.current_role() IN ('super_admin', 'inventory_admin', 'it_admin', 'facilities_admin'), false);
$$;

CREATE OR REPLACE FUNCTION private.is_hr()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(private.current_role() IN ('super_admin', 'hr'), false);
$$;

CREATE OR REPLACE FUNCTION private.managed_domains()
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE private.current_role()
    WHEN 'super_admin' THEN ARRAY['it', 'facilities']
    WHEN 'inventory_admin' THEN ARRAY['it', 'facilities']
    WHEN 'it_admin' THEN ARRAY['it']
    WHEN 'facilities_admin' THEN ARRAY['facilities']
    ELSE ARRAY[]::TEXT[]
  END;
$$;

CREATE OR REPLACE FUNCTION private.can_manage_domain(p_domain TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.is_super_admin() OR p_domain = ANY(private.managed_domains());
$$;

GRANT EXECUTE ON FUNCTION private.is_hr() TO authenticated;
GRANT EXECUTE ON FUNCTION private.managed_domains() TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_manage_domain(TEXT) TO authenticated;

-- Locations RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS locations_select ON public.locations;
DROP POLICY IF EXISTS locations_write ON public.locations;
CREATE POLICY locations_select ON public.locations FOR SELECT TO authenticated USING (true);
CREATE POLICY locations_write ON public.locations FOR ALL TO authenticated
  USING (private.is_super_admin() OR private.current_role() IN ('facilities_admin', 'it_admin', 'inventory_admin'))
  WITH CHECK (private.is_super_admin() OR private.current_role() IN ('facilities_admin', 'it_admin', 'inventory_admin'));

-- Subcategories RLS
ALTER TABLE public.asset_subcategories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS subcategories_select ON public.asset_subcategories;
DROP POLICY IF EXISTS subcategories_write ON public.asset_subcategories;
CREATE POLICY subcategories_select ON public.asset_subcategories FOR SELECT TO authenticated USING (true);
CREATE POLICY subcategories_write ON public.asset_subcategories FOR ALL TO authenticated
  USING (
    private.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.asset_categories c
      WHERE c.id = asset_subcategories.category_id AND private.can_manage_domain(c.domain)
    )
  )
  WITH CHECK (
    private.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.asset_categories c
      WHERE c.id = category_id AND private.can_manage_domain(c.domain)
    )
  );

-- Distributions RLS
ALTER TABLE public.distributions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS distributions_select ON public.distributions;
DROP POLICY IF EXISTS distributions_write ON public.distributions;
CREATE POLICY distributions_select ON public.distributions FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR employee_id = private.employee_id_for_user()
  );
CREATE POLICY distributions_write ON public.distributions FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());

-- Replace category write to be domain-aware
DROP POLICY IF EXISTS categories_write ON public.asset_categories;
CREATE POLICY categories_write ON public.asset_categories FOR ALL TO authenticated
  USING (private.can_manage_domain(domain) OR private.is_super_admin())
  WITH CHECK (private.can_manage_domain(domain) OR private.is_super_admin());

-- Replace assets policies with domain scoping
DROP POLICY IF EXISTS assets_select ON public.assets;
DROP POLICY IF EXISTS assets_write ON public.assets;
CREATE POLICY assets_select ON public.assets FOR SELECT TO authenticated
  USING (
    private.is_super_admin()
    OR private.current_role() = 'inventory_admin'
    OR (
      private.is_inventory_admin()
      AND (
        category_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.asset_categories c
          WHERE c.id = assets.category_id AND private.can_manage_domain(c.domain)
        )
      )
    )
    OR id IN (
      SELECT aa.asset_id FROM public.asset_assignments aa
      WHERE aa.employee_id = private.employee_id_for_user() AND aa.is_active = true
    )
  );
CREATE POLICY assets_write ON public.assets FOR ALL TO authenticated
  USING (
    private.is_super_admin()
    OR (
      private.is_inventory_admin()
      AND (
        category_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.asset_categories c
          WHERE c.id = assets.category_id AND private.can_manage_domain(c.domain)
        )
      )
    )
  )
  WITH CHECK (
    private.is_super_admin()
    OR (
      private.is_inventory_admin()
      AND (
        category_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.asset_categories c
          WHERE c.id = category_id AND private.can_manage_domain(c.domain)
        )
      )
    )
  );

-- Employees: HR can manage
DROP POLICY IF EXISTS employees_select ON public.employees;
DROP POLICY IF EXISTS employees_write ON public.employees;
CREATE POLICY employees_select ON public.employees FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_admin() OR private.is_hr());
CREATE POLICY employees_write ON public.employees FOR ALL TO authenticated
  USING (private.is_admin() OR private.is_hr())
  WITH CHECK (private.is_admin() OR private.is_hr());

-- Assignments: domain-scoped write via asset category
DROP POLICY IF EXISTS assignments_write ON public.asset_assignments;
CREATE POLICY assignments_write ON public.asset_assignments FOR ALL TO authenticated
  USING (
    private.is_super_admin()
    OR (
      private.is_inventory_admin()
      AND EXISTS (
        SELECT 1 FROM public.assets a
        LEFT JOIN public.asset_categories c ON c.id = a.category_id
        WHERE a.id = asset_assignments.asset_id
          AND (c.id IS NULL OR private.can_manage_domain(c.domain))
      )
    )
  )
  WITH CHECK (
    private.is_super_admin()
    OR (
      private.is_inventory_admin()
      AND EXISTS (
        SELECT 1 FROM public.assets a
        LEFT JOIN public.asset_categories c ON c.id = a.category_id
        WHERE a.id = asset_id
          AND (c.id IS NULL OR private.can_manage_domain(c.domain))
      )
    )
  );

-- Enhanced dashboard stats with overdue + warranty
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  emp_id UUID;
  domains TEXT[];
BEGIN
  domains := private.managed_domains();
  IF private.is_admin() OR private.is_hr() THEN
    SELECT jsonb_build_object(
      'total_assets', (SELECT COUNT(*) FROM assets a LEFT JOIN asset_categories c ON c.id = a.category_id WHERE private.is_super_admin() OR private.current_role() = 'inventory_admin' OR COALESCE(c.domain, 'it') = ANY(domains) OR private.is_hr()),
      'permanent_assets', (SELECT COUNT(*) FROM assets a LEFT JOIN asset_categories c ON c.id = a.category_id WHERE a.asset_type = 'permanent' AND (private.is_super_admin() OR private.current_role() = 'inventory_admin' OR COALESCE(c.domain, 'it') = ANY(domains) OR cardinality(domains)=0)),
      'disposable_stock', (SELECT COALESCE(SUM(a.quantity), 0) FROM assets a LEFT JOIN asset_categories c ON c.id = a.category_id WHERE a.asset_type = 'disposable' AND (private.is_super_admin() OR private.current_role() = 'inventory_admin' OR COALESCE(c.domain, 'it') = ANY(domains))),
      'assigned_assets', (SELECT COUNT(*) FROM assets a LEFT JOIN asset_categories c ON c.id = a.category_id WHERE a.status = 'assigned' AND (private.is_super_admin() OR private.current_role() = 'inventory_admin' OR COALESCE(c.domain, 'it') = ANY(domains))),
      'available_assets', (SELECT COUNT(*) FROM assets a LEFT JOIN asset_categories c ON c.id = a.category_id WHERE a.status = 'available' AND (private.is_super_admin() OR private.current_role() = 'inventory_admin' OR COALESCE(c.domain, 'it') = ANY(domains))),
      'low_stock_count', (SELECT COUNT(*) FROM assets a WHERE a.asset_type = 'disposable' AND a.quantity <= a.minimum_stock_level),
      'open_maintenance', (SELECT COUNT(*) FROM maintenance_records WHERE status IN ('open', 'in_progress')),
      'pending_requests', (SELECT COUNT(*) FROM requests WHERE status = 'pending'),
      'overdue_assignments', (SELECT COUNT(*) FROM asset_assignments WHERE is_active AND expected_return_date IS NOT NULL AND expected_return_date < CURRENT_DATE),
      'warranty_expiring_30', (SELECT COUNT(*) FROM assets WHERE warranty_expiry IS NOT NULL AND warranty_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + 30),
      'active_employees', (SELECT COUNT(*) FROM employees WHERE is_active),
      'coverage_rate', (
        SELECT CASE WHEN COUNT(*) FILTER (WHERE is_active) = 0 THEN 0
          ELSE ROUND(100.0 * COUNT(DISTINCT aa.employee_id) FILTER (WHERE e.is_active AND aa.is_active) / NULLIF(COUNT(*) FILTER (WHERE e.is_active), 0), 1)
        END
        FROM employees e
        LEFT JOIN asset_assignments aa ON aa.employee_id = e.id AND aa.is_active
      )
    ) INTO result;
  ELSE
    emp_id := private.employee_id_for_user();
    SELECT jsonb_build_object(
      'total_assets', (SELECT COUNT(*) FROM asset_assignments WHERE employee_id = emp_id AND is_active),
      'permanent_assets', (SELECT COUNT(*) FROM asset_assignments aa JOIN assets a ON a.id = aa.asset_id WHERE aa.employee_id = emp_id AND aa.is_active AND a.asset_type = 'permanent'),
      'disposable_stock', 0,
      'assigned_assets', (SELECT COUNT(*) FROM asset_assignments WHERE employee_id = emp_id AND is_active),
      'available_assets', 0,
      'low_stock_count', 0,
      'open_maintenance', (SELECT COUNT(*) FROM maintenance_records WHERE status IN ('open', 'in_progress') AND (reported_by = auth.uid() OR asset_id IN (SELECT asset_id FROM asset_assignments WHERE employee_id = emp_id AND is_active))),
      'pending_requests', (SELECT COUNT(*) FROM requests WHERE employee_id = emp_id AND status = 'pending'),
      'overdue_assignments', (SELECT COUNT(*) FROM asset_assignments WHERE employee_id = emp_id AND is_active AND expected_return_date < CURRENT_DATE),
      'warranty_expiring_30', 0,
      'active_employees', 0,
      'coverage_rate', 0
    ) INTO result;
  END IF;
  RETURN result;
END;
$$;
