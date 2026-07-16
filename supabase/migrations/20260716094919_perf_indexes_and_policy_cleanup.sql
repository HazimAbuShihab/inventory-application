-- Performance:
-- 1. Covering indexes for 7 unindexed foreign keys (advisor: unindexed_foreign_keys)
-- 2. Wrap auth.uid() in scalar subselects (advisor: auth_rls_initplan)
-- 3. Split FOR ALL write policies into INSERT/UPDATE/DELETE so SELECT runs a single policy
--    (advisor: multiple_permissive_policies)
-- 4. low_stock_assets() RPC — column-to-column comparison can't be expressed in PostgREST,
--    the client previously downloaded every disposable asset and filtered in JS

-- 1. FK covering indexes
CREATE INDEX IF NOT EXISTS idx_asset_assignments_assigned_by ON public.asset_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_asset_transactions_performed_by ON public.asset_transactions(performed_by);
CREATE INDEX IF NOT EXISTS idx_departments_location_id ON public.departments(location_id);
CREATE INDEX IF NOT EXISTS idx_distributions_distributed_by ON public.distributions(distributed_by);
CREATE INDEX IF NOT EXISTS idx_maintenance_reported_by ON public.maintenance_records(reported_by);
CREATE INDEX IF NOT EXISTS idx_requests_approved_by ON public.requests(approved_by);
CREATE INDEX IF NOT EXISTS idx_requests_asset_category_id ON public.requests(asset_category_id);

-- 2 + 3. Policy cleanup

-- ROLES
DROP POLICY IF EXISTS roles_all_super ON public.roles;
CREATE POLICY roles_insert ON public.roles FOR INSERT TO authenticated
  WITH CHECK (private.is_super_admin());
CREATE POLICY roles_update ON public.roles FOR UPDATE TO authenticated
  USING (private.is_super_admin()) WITH CHECK (private.is_super_admin());
CREATE POLICY roles_delete ON public.roles FOR DELETE TO authenticated
  USING (private.is_super_admin());

-- DEPARTMENTS
DROP POLICY IF EXISTS departments_write ON public.departments;
CREATE POLICY departments_insert ON public.departments FOR INSERT TO authenticated
  WITH CHECK (private.is_admin());
CREATE POLICY departments_update ON public.departments FOR UPDATE TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY departments_delete ON public.departments FOR DELETE TO authenticated
  USING (private.is_admin());

-- EMPLOYEES
DROP POLICY IF EXISTS employees_select ON public.employees;
CREATE POLICY employees_select ON public.employees FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR private.is_admin() OR private.is_hr());
DROP POLICY IF EXISTS employees_write ON public.employees;
CREATE POLICY employees_insert ON public.employees FOR INSERT TO authenticated
  WITH CHECK (private.is_admin() OR private.is_hr());
CREATE POLICY employees_update ON public.employees FOR UPDATE TO authenticated
  USING (private.is_admin() OR private.is_hr()) WITH CHECK (private.is_admin() OR private.is_hr());
CREATE POLICY employees_delete ON public.employees FOR DELETE TO authenticated
  USING (private.is_admin() OR private.is_hr());

-- ASSET CATEGORIES
DROP POLICY IF EXISTS categories_write ON public.asset_categories;
CREATE POLICY categories_insert ON public.asset_categories FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_domain(domain) OR private.is_super_admin());
CREATE POLICY categories_update ON public.asset_categories FOR UPDATE TO authenticated
  USING (private.can_manage_domain(domain) OR private.is_super_admin())
  WITH CHECK (private.can_manage_domain(domain) OR private.is_super_admin());
CREATE POLICY categories_delete ON public.asset_categories FOR DELETE TO authenticated
  USING (private.can_manage_domain(domain) OR private.is_super_admin());

-- ASSET SUBCATEGORIES
DROP POLICY IF EXISTS subcategories_write ON public.asset_subcategories;
CREATE POLICY subcategories_insert ON public.asset_subcategories FOR INSERT TO authenticated
  WITH CHECK (
    private.is_super_admin() OR private.category_in_managed_domain(category_id)
  );
CREATE POLICY subcategories_update ON public.asset_subcategories FOR UPDATE TO authenticated
  USING (private.is_super_admin() OR private.category_in_managed_domain(category_id))
  WITH CHECK (private.is_super_admin() OR private.category_in_managed_domain(category_id));
CREATE POLICY subcategories_delete ON public.asset_subcategories FOR DELETE TO authenticated
  USING (private.is_super_admin() OR private.category_in_managed_domain(category_id));

-- ASSET TRANSACTIONS
DROP POLICY IF EXISTS transactions_write ON public.asset_transactions;
CREATE POLICY transactions_insert ON public.asset_transactions FOR INSERT TO authenticated
  WITH CHECK (private.is_admin());
CREATE POLICY transactions_update ON public.asset_transactions FOR UPDATE TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY transactions_delete ON public.asset_transactions FOR DELETE TO authenticated
  USING (private.is_admin());

-- LOCATIONS
DROP POLICY IF EXISTS locations_write ON public.locations;
CREATE POLICY locations_insert ON public.locations FOR INSERT TO authenticated
  WITH CHECK (private.is_admin());
CREATE POLICY locations_update ON public.locations FOR UPDATE TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY locations_delete ON public.locations FOR DELETE TO authenticated
  USING (private.is_admin());

-- DISTRIBUTIONS
DROP POLICY IF EXISTS distributions_write ON public.distributions;
CREATE POLICY distributions_insert ON public.distributions FOR INSERT TO authenticated
  WITH CHECK (private.is_admin());
CREATE POLICY distributions_update ON public.distributions FOR UPDATE TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY distributions_delete ON public.distributions FOR DELETE TO authenticated
  USING (private.is_admin());

-- MAINTENANCE: initplan fixes
DROP POLICY IF EXISTS maintenance_select ON public.maintenance_records;
CREATE POLICY maintenance_select ON public.maintenance_records FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR reported_by = (SELECT auth.uid())
    OR asset_id IN (SELECT private.assigned_asset_ids_for_current_user())
  );
DROP POLICY IF EXISTS maintenance_insert ON public.maintenance_records;
CREATE POLICY maintenance_insert ON public.maintenance_records FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR (
      reported_by = (SELECT auth.uid())
      AND asset_id IN (SELECT private.assigned_asset_ids_for_current_user())
    )
  );

-- 4. Low-stock RPC (SECURITY INVOKER: RLS still applies)
CREATE OR REPLACE FUNCTION public.low_stock_assets()
RETURNS SETOF public.assets
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT * FROM public.assets
  WHERE asset_type = 'disposable' AND quantity <= minimum_stock_level
  ORDER BY quantity ASC;
$$;

REVOKE ALL ON FUNCTION public.low_stock_assets() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.low_stock_assets() TO authenticated;
