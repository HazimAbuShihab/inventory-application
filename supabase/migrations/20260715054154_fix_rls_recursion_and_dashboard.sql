-- Break assets <-> assignments RLS recursion with SECURITY DEFINER helpers

CREATE OR REPLACE FUNCTION private.assigned_asset_ids_for_current_user()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT aa.asset_id
  FROM public.asset_assignments aa
  WHERE aa.employee_id = private.employee_id_for_user()
    AND aa.is_active = true;
$$;

CREATE OR REPLACE FUNCTION private.asset_in_managed_domain(p_asset_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.assets a
    LEFT JOIN public.asset_categories c ON c.id = a.category_id
    WHERE a.id = p_asset_id
      AND (
        private.is_super_admin()
        OR private.current_role() = 'inventory_admin'
        OR c.id IS NULL
        OR private.can_manage_domain(c.domain)
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.category_in_managed_domain(p_category_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_category_id IS NULL
    OR private.is_super_admin()
    OR private.current_role() = 'inventory_admin'
    OR EXISTS (
      SELECT 1 FROM public.asset_categories c
      WHERE c.id = p_category_id AND private.can_manage_domain(c.domain)
    );
$$;

GRANT EXECUTE ON FUNCTION private.assigned_asset_ids_for_current_user() TO authenticated;
GRANT EXECUTE ON FUNCTION private.asset_in_managed_domain(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.category_in_managed_domain(UUID) TO authenticated;

-- Recreate assets policies without cross-table RLS recursion
DROP POLICY IF EXISTS assets_select ON public.assets;
DROP POLICY IF EXISTS assets_write ON public.assets;
DROP POLICY IF EXISTS assets_employee_update_status ON public.assets;

CREATE POLICY assets_select ON public.assets FOR SELECT TO authenticated
  USING (
    private.is_super_admin()
    OR private.current_role() = 'inventory_admin'
    OR (
      private.is_inventory_admin()
      AND private.category_in_managed_domain(category_id)
    )
    OR id IN (SELECT private.assigned_asset_ids_for_current_user())
  );

CREATE POLICY assets_insert ON public.assets FOR INSERT TO authenticated
  WITH CHECK (
    private.is_super_admin()
    OR (
      private.is_inventory_admin()
      AND private.category_in_managed_domain(category_id)
    )
  );

CREATE POLICY assets_update ON public.assets FOR UPDATE TO authenticated
  USING (
    private.is_super_admin()
    OR (
      private.is_inventory_admin()
      AND private.category_in_managed_domain(category_id)
    )
    OR id IN (SELECT private.assigned_asset_ids_for_current_user())
  )
  WITH CHECK (
    private.is_super_admin()
    OR (
      private.is_inventory_admin()
      AND private.category_in_managed_domain(category_id)
    )
    OR (
      id IN (SELECT private.assigned_asset_ids_for_current_user())
      AND status = ANY (ARRAY['damaged'::text, 'lost'::text, 'assigned'::text, 'under_maintenance'::text])
    )
  );

CREATE POLICY assets_delete ON public.assets FOR DELETE TO authenticated
  USING (
    private.is_super_admin()
    OR (
      private.is_inventory_admin()
      AND private.category_in_managed_domain(category_id)
    )
  );

-- Split assignments_write out of FOR ALL so SELECT no longer queries assets
DROP POLICY IF EXISTS assignments_write ON public.asset_assignments;

CREATE POLICY assignments_insert ON public.asset_assignments FOR INSERT TO authenticated
  WITH CHECK (
    private.is_super_admin()
    OR (private.is_inventory_admin() AND private.asset_in_managed_domain(asset_id))
  );

CREATE POLICY assignments_update ON public.asset_assignments FOR UPDATE TO authenticated
  USING (
    private.is_super_admin()
    OR (private.is_inventory_admin() AND private.asset_in_managed_domain(asset_id))
  )
  WITH CHECK (
    private.is_super_admin()
    OR (private.is_inventory_admin() AND private.asset_in_managed_domain(asset_id))
  );

CREATE POLICY assignments_delete ON public.asset_assignments FOR DELETE TO authenticated
  USING (
    private.is_super_admin()
    OR (private.is_inventory_admin() AND private.asset_in_managed_domain(asset_id))
  );

-- Fix ambiguous is_active in dashboard stats
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
      'total_assets', (
        SELECT COUNT(*) FROM assets a
        LEFT JOIN asset_categories c ON c.id = a.category_id
        WHERE private.is_super_admin()
           OR private.current_role() = 'inventory_admin'
           OR private.is_hr()
           OR COALESCE(c.domain, 'it') = ANY (domains)
      ),
      'permanent_assets', (
        SELECT COUNT(*) FROM assets a
        LEFT JOIN asset_categories c ON c.id = a.category_id
        WHERE a.asset_type = 'permanent'
          AND (
            private.is_super_admin()
            OR private.current_role() = 'inventory_admin'
            OR COALESCE(c.domain, 'it') = ANY (domains)
            OR cardinality(domains) = 0
          )
      ),
      'disposable_stock', (
        SELECT COALESCE(SUM(a.quantity), 0) FROM assets a
        LEFT JOIN asset_categories c ON c.id = a.category_id
        WHERE a.asset_type = 'disposable'
          AND (
            private.is_super_admin()
            OR private.current_role() = 'inventory_admin'
            OR COALESCE(c.domain, 'it') = ANY (domains)
          )
      ),
      'assigned_assets', (
        SELECT COUNT(*) FROM assets a
        LEFT JOIN asset_categories c ON c.id = a.category_id
        WHERE a.status = 'assigned'
          AND (
            private.is_super_admin()
            OR private.current_role() = 'inventory_admin'
            OR COALESCE(c.domain, 'it') = ANY (domains)
          )
      ),
      'available_assets', (
        SELECT COUNT(*) FROM assets a
        LEFT JOIN asset_categories c ON c.id = a.category_id
        WHERE a.status = 'available'
          AND (
            private.is_super_admin()
            OR private.current_role() = 'inventory_admin'
            OR COALESCE(c.domain, 'it') = ANY (domains)
          )
      ),
      'low_stock_count', (
        SELECT COUNT(*) FROM assets a
        WHERE a.asset_type = 'disposable' AND a.quantity <= a.minimum_stock_level
      ),
      'open_maintenance', (
        SELECT COUNT(*) FROM maintenance_records WHERE status IN ('open', 'in_progress')
      ),
      'pending_requests', (
        SELECT COUNT(*) FROM requests WHERE status = 'pending'
      ),
      'overdue_assignments', (
        SELECT COUNT(*) FROM asset_assignments aa
        WHERE aa.is_active AND aa.expected_return_date IS NOT NULL AND aa.expected_return_date < CURRENT_DATE
      ),
      'warranty_expiring_30', (
        SELECT COUNT(*) FROM assets a
        WHERE a.warranty_expiry IS NOT NULL
          AND a.warranty_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + 30
      ),
      'active_employees', (
        SELECT COUNT(*) FROM employees e WHERE e.is_active
      ),
      'coverage_rate', (
        SELECT CASE
          WHEN COUNT(*) FILTER (WHERE e.is_active) = 0 THEN 0
          ELSE ROUND(
            100.0 * COUNT(DISTINCT aa.employee_id) FILTER (WHERE e.is_active AND aa.is_active)
              / NULLIF(COUNT(*) FILTER (WHERE e.is_active), 0),
            1
          )
        END
        FROM employees e
        LEFT JOIN asset_assignments aa ON aa.employee_id = e.id AND aa.is_active
      )
    ) INTO result;
  ELSE
    emp_id := private.employee_id_for_user();
    SELECT jsonb_build_object(
      'total_assets', (SELECT COUNT(*) FROM asset_assignments aa WHERE aa.employee_id = emp_id AND aa.is_active),
      'permanent_assets', (
        SELECT COUNT(*) FROM asset_assignments aa
        JOIN assets a ON a.id = aa.asset_id
        WHERE aa.employee_id = emp_id AND aa.is_active AND a.asset_type = 'permanent'
      ),
      'disposable_stock', 0,
      'assigned_assets', (SELECT COUNT(*) FROM asset_assignments aa WHERE aa.employee_id = emp_id AND aa.is_active),
      'available_assets', 0,
      'low_stock_count', 0,
      'open_maintenance', (
        SELECT COUNT(*) FROM maintenance_records mr
        WHERE mr.status IN ('open', 'in_progress')
          AND (
            mr.reported_by = auth.uid()
            OR mr.asset_id IN (
              SELECT aa.asset_id FROM asset_assignments aa
              WHERE aa.employee_id = emp_id AND aa.is_active
            )
          )
      ),
      'pending_requests', (SELECT COUNT(*) FROM requests r WHERE r.employee_id = emp_id AND r.status = 'pending'),
      'overdue_assignments', (
        SELECT COUNT(*) FROM asset_assignments aa
        WHERE aa.employee_id = emp_id AND aa.is_active
          AND aa.expected_return_date IS NOT NULL AND aa.expected_return_date < CURRENT_DATE
      ),
      'warranty_expiring_30', 0,
      'active_employees', 0,
      'coverage_rate', 0
    ) INTO result;
  END IF;

  RETURN result;
END;
$$;
