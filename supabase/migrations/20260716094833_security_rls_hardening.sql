-- Security hardening:
-- 1. Stop domain admins from updating non-employee users (privilege demotion attack)
-- 2. Restrict employee asset updates to status changes only (column guard)
-- 3. Remove client audit-log inserts (forgery); triggers bypass RLS as table owner
-- 4. Pin own status in self-update policy (suspended users can't re-activate)
-- 5. Give HR read access to users (fixes blank names on Employees page for HR)
-- 6. Require admin/HR role for next_employee_number()
-- 7. Restrict domain-admin user inserts to employee role only

-- Scalar helpers (SECURITY DEFINER, initplan-friendly, avoid same-table subqueries in policies)
CREATE OR REPLACE FUNCTION private.current_user_role_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role_id FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.current_user_status()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.employee_role_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.roles WHERE name = 'employee';
$$;

GRANT EXECUTE ON FUNCTION private.current_user_role_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_user_status() TO authenticated;
GRANT EXECUTE ON FUNCTION private.employee_role_id() TO authenticated;

-- USERS: rebuild policies (single policy per action; HR gains SELECT)
DROP POLICY IF EXISTS users_select_own_or_admin ON public.users;
DROP POLICY IF EXISTS users_update_own ON public.users;
DROP POLICY IF EXISTS users_admin_all ON public.users;
DROP POLICY IF EXISTS users_inv_admin_update ON public.users;
DROP POLICY IF EXISTS users_inv_admin_insert ON public.users;

CREATE POLICY users_select ON public.users FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR private.is_admin() OR private.is_hr());

CREATE POLICY users_insert ON public.users FOR INSERT TO authenticated
  WITH CHECK (
    private.is_super_admin()
    OR (private.is_inventory_admin() AND role_id = private.employee_role_id())
  );

CREATE POLICY users_update ON public.users FOR UPDATE TO authenticated
  USING (
    private.is_super_admin()
    OR (private.is_inventory_admin() AND role_id = private.employee_role_id())
    OR id = (SELECT auth.uid())
  )
  WITH CHECK (
    private.is_super_admin()
    OR (
      private.is_inventory_admin()
      AND id <> (SELECT auth.uid())
      AND role_id = private.employee_role_id()
    )
    OR (
      id = (SELECT auth.uid())
      AND role_id = private.current_user_role_id()
      AND status = private.current_user_status()
    )
  );

CREATE POLICY users_delete ON public.users FOR DELETE TO authenticated
  USING (private.is_super_admin());

-- AUDIT LOGS: remove client insert path; SECURITY DEFINER triggers bypass RLS
DROP POLICY IF EXISTS audit_insert ON public.audit_logs;

-- ASSETS: column guard — non-admins may only change status (and triggers touch updated_at)
CREATE OR REPLACE FUNCTION private.enforce_employee_asset_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service/trigger contexts and admins are unrestricted
  IF auth.uid() IS NULL OR private.is_inventory_admin() THEN
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - 'status' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'updated_at') THEN
    RAISE EXCEPTION 'Employees may only update asset status';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assets_employee_column_guard ON public.assets;
CREATE TRIGGER trg_assets_employee_column_guard
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION private.enforce_employee_asset_update();

-- next_employee_number: restrict to admin/HR callers
CREATE OR REPLACE FUNCTION public.next_employee_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  yy TEXT := to_char(CURRENT_DATE, 'YY');
  seq INT;
BEGIN
  IF NOT (private.is_inventory_admin() OR private.is_hr()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE(MAX(
    CASE WHEN employee_number ~ ('^EMP' || yy || '[0-9]{3}$')
      THEN substring(employee_number from 6)::int ELSE 0 END
  ), 0) + 1 INTO seq FROM public.employees;
  RETURN 'EMP' || yy || lpad(seq::text, 3, '0');
END;
$$;
