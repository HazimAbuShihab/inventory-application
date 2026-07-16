-- Private schema for SECURITY DEFINER helpers
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_assets_updated_at BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_maintenance_updated_at BEFORE UPDATE ON public.maintenance_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_requests_updated_at BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Role helpers
CREATE OR REPLACE FUNCTION private.current_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.name
  FROM public.users u
  JOIN public.roles r ON r.id = u.role_id
  WHERE u.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(private.current_role() = 'super_admin', false);
$$;

CREATE OR REPLACE FUNCTION private.is_inventory_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(private.current_role() IN ('super_admin', 'inventory_admin'), false);
$$;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.is_inventory_admin();
$$;

CREATE OR REPLACE FUNCTION private.employee_id_for_user()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id FROM public.employees e WHERE e.user_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION private.current_role() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_inventory_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.employee_id_for_user() TO authenticated;

-- Public wrappers for client use
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.current_role();
$$;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

-- Sync role to app_metadata
CREATE OR REPLACE FUNCTION private.sync_user_app_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_name TEXT;
BEGIN
  SELECT r.name INTO role_name FROM public.roles r WHERE r.id = NEW.role_id;
  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', role_name)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_sync_app_metadata
  AFTER INSERT OR UPDATE OF role_id ON public.users
  FOR EACH ROW EXECUTE FUNCTION private.sync_user_app_metadata();

-- Handle new auth user: create public.users profile from metadata
CREATE OR REPLACE FUNCTION private.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role_id UUID;
  emp_role_id UUID;
  meta_role TEXT;
  selected_role_id UUID;
BEGIN
  SELECT id INTO emp_role_id FROM public.roles WHERE name = 'employee' LIMIT 1;
  meta_role := NEW.raw_app_meta_data->>'role';
  IF meta_role IS NOT NULL THEN
    SELECT id INTO selected_role_id FROM public.roles WHERE name = meta_role LIMIT 1;
  END IF;
  selected_role_id := COALESCE(selected_role_id, emp_role_id);

  INSERT INTO public.users (id, full_name, email, role_id, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    selected_role_id,
    'active'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_auth_user();

-- Assignment status sync
CREATE OR REPLACE FUNCTION private.sync_assignment_asset_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.assets SET status = 'assigned', updated_at = now() WHERE id = NEW.asset_id;
    INSERT INTO public.asset_transactions (asset_id, transaction_type, quantity, performed_by, notes)
    VALUES (NEW.asset_id, 'assignment', 1, NEW.assigned_by, 'Auto: asset assigned');
  ELSIF TG_OP = 'UPDATE' AND OLD.returned_date IS NULL AND NEW.returned_date IS NOT NULL THEN
    UPDATE public.assets SET status = 'available', updated_at = now() WHERE id = NEW.asset_id;
    INSERT INTO public.asset_transactions (asset_id, transaction_type, quantity, performed_by, notes)
    VALUES (NEW.asset_id, 'return', 1, auth.uid(), 'Auto: asset returned');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assignment_status
  AFTER INSERT OR UPDATE OF returned_date ON public.asset_assignments
  FOR EACH ROW EXECUTE FUNCTION private.sync_assignment_asset_status();

-- Disposable stock adjustment
CREATE OR REPLACE FUNCTION private.adjust_stock_on_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a_type TEXT;
BEGIN
  SELECT asset_type INTO a_type FROM public.assets WHERE id = NEW.asset_id;
  IF a_type = 'disposable' THEN
    IF NEW.transaction_type IN ('purchase', 'stock_in', 'adjustment') THEN
      IF NEW.transaction_type = 'adjustment' AND NEW.notes ILIKE 'decrease%' THEN
        UPDATE public.assets SET quantity = GREATEST(0, quantity - NEW.quantity), updated_at = now() WHERE id = NEW.asset_id;
      ELSIF NEW.transaction_type = 'stock_out' OR NEW.transaction_type = 'disposal' THEN
        UPDATE public.assets SET quantity = GREATEST(0, quantity - NEW.quantity), updated_at = now() WHERE id = NEW.asset_id;
      ELSE
        UPDATE public.assets SET quantity = quantity + NEW.quantity, updated_at = now() WHERE id = NEW.asset_id;
      END IF;
    ELSIF NEW.transaction_type IN ('stock_out', 'disposal') THEN
      UPDATE public.assets SET quantity = GREATEST(0, quantity - NEW.quantity), updated_at = now() WHERE id = NEW.asset_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stock_adjustment
  AFTER INSERT ON public.asset_transactions
  FOR EACH ROW EXECUTE FUNCTION private.adjust_stock_on_transaction();

-- Audit log helper
CREATE OR REPLACE FUNCTION private.write_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, entity, entity_id, new_values)
    VALUES (auth.uid(), 'INSERT', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action, entity, entity_id, old_values, new_values)
    VALUES (auth.uid(), 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, entity, entity_id, old_values)
    VALUES (auth.uid(), 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_assets AFTER INSERT OR UPDATE OR DELETE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION private.write_audit_log();
CREATE TRIGGER trg_audit_assignments AFTER INSERT OR UPDATE OR DELETE ON public.asset_assignments
  FOR EACH ROW EXECUTE FUNCTION private.write_audit_log();
CREATE TRIGGER trg_audit_transactions AFTER INSERT OR UPDATE OR DELETE ON public.asset_transactions
  FOR EACH ROW EXECUTE FUNCTION private.write_audit_log();
CREATE TRIGGER trg_audit_requests AFTER INSERT OR UPDATE OR DELETE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION private.write_audit_log();
CREATE TRIGGER trg_audit_maintenance AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_records
  FOR EACH ROW EXECUTE FUNCTION private.write_audit_log();
CREATE TRIGGER trg_audit_users AFTER INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION private.write_audit_log();

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ROLES policies
CREATE POLICY roles_select ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY roles_all_super ON public.roles FOR ALL TO authenticated
  USING (private.is_super_admin()) WITH CHECK (private.is_super_admin());

-- DEPARTMENTS
CREATE POLICY departments_select ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY departments_write ON public.departments FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());

-- USERS
CREATE POLICY users_select_own_or_admin ON public.users FOR SELECT TO authenticated
  USING (id = auth.uid() OR private.is_admin());
CREATE POLICY users_update_own ON public.users FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role_id = (SELECT role_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY users_admin_all ON public.users FOR ALL TO authenticated
  USING (private.is_super_admin()) WITH CHECK (private.is_super_admin());
CREATE POLICY users_inv_admin_update ON public.users FOR UPDATE TO authenticated
  USING (private.is_inventory_admin() AND NOT private.is_super_admin())
  WITH CHECK (
    private.is_inventory_admin()
    AND role_id = (SELECT id FROM public.roles WHERE name = 'employee')
  );
CREATE POLICY users_inv_admin_insert ON public.users FOR INSERT TO authenticated
  WITH CHECK (
    private.is_inventory_admin()
    AND role_id IN (SELECT id FROM public.roles WHERE name IN ('employee', 'inventory_admin'))
  );

-- EMPLOYEES
CREATE POLICY employees_select ON public.employees FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_admin());
CREATE POLICY employees_write ON public.employees FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());

-- CATEGORIES
CREATE POLICY categories_select ON public.asset_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY categories_write ON public.asset_categories FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());

-- ASSETS
CREATE POLICY assets_select ON public.assets FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR id IN (
      SELECT aa.asset_id FROM public.asset_assignments aa
      WHERE aa.employee_id = private.employee_id_for_user() AND aa.returned_date IS NULL
    )
  );
CREATE POLICY assets_write ON public.assets FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY assets_employee_update_status ON public.assets FOR UPDATE TO authenticated
  USING (
    id IN (
      SELECT aa.asset_id FROM public.asset_assignments aa
      WHERE aa.employee_id = private.employee_id_for_user() AND aa.returned_date IS NULL
    )
  )
  WITH CHECK (status IN ('damaged', 'lost', 'assigned', 'under_maintenance'));

-- ASSIGNMENTS
CREATE POLICY assignments_select ON public.asset_assignments FOR SELECT TO authenticated
  USING (employee_id = private.employee_id_for_user() OR private.is_admin());
CREATE POLICY assignments_write ON public.asset_assignments FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());

-- TRANSACTIONS
CREATE POLICY transactions_select ON public.asset_transactions FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR asset_id IN (
      SELECT aa.asset_id FROM public.asset_assignments aa
      WHERE aa.employee_id = private.employee_id_for_user()
    )
  );
CREATE POLICY transactions_write ON public.asset_transactions FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());

-- MAINTENANCE
CREATE POLICY maintenance_select ON public.maintenance_records FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR reported_by = auth.uid()
    OR asset_id IN (
      SELECT aa.asset_id FROM public.asset_assignments aa
      WHERE aa.employee_id = private.employee_id_for_user() AND aa.returned_date IS NULL
    )
  );
CREATE POLICY maintenance_insert ON public.maintenance_records FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR (
      reported_by = auth.uid()
      AND asset_id IN (
        SELECT aa.asset_id FROM public.asset_assignments aa
        WHERE aa.employee_id = private.employee_id_for_user() AND aa.returned_date IS NULL
      )
    )
  );
CREATE POLICY maintenance_admin_update ON public.maintenance_records FOR UPDATE TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY maintenance_admin_delete ON public.maintenance_records FOR DELETE TO authenticated
  USING (private.is_admin());

-- REQUESTS
CREATE POLICY requests_select ON public.requests FOR SELECT TO authenticated
  USING (employee_id = private.employee_id_for_user() OR private.is_admin());
CREATE POLICY requests_insert ON public.requests FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = private.employee_id_for_user()
    OR private.is_admin()
  );
CREATE POLICY requests_update ON public.requests FOR UPDATE TO authenticated
  USING (
    private.is_admin()
    OR (employee_id = private.employee_id_for_user() AND status = 'pending')
  )
  WITH CHECK (
    private.is_admin()
    OR (employee_id = private.employee_id_for_user() AND status IN ('pending', 'cancelled'))
  );
CREATE POLICY requests_delete ON public.requests FOR DELETE TO authenticated
  USING (private.is_admin());

-- AUDIT LOGS
CREATE POLICY audit_select ON public.audit_logs FOR SELECT TO authenticated
  USING (private.is_super_admin() OR private.is_inventory_admin());
CREATE POLICY audit_insert ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'asset-images',
  'asset-images',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY asset_images_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'asset-images');
CREATE POLICY asset_images_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'asset-images' AND private.is_admin());
CREATE POLICY asset_images_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'asset-images' AND private.is_admin())
  WITH CHECK (bucket_id = 'asset-images' AND private.is_admin());
CREATE POLICY asset_images_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'asset-images' AND private.is_admin());

-- Dashboard stats RPC
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
BEGIN
  IF private.is_admin() THEN
    SELECT jsonb_build_object(
      'total_assets', (SELECT COUNT(*) FROM assets),
      'permanent_assets', (SELECT COUNT(*) FROM assets WHERE asset_type = 'permanent'),
      'disposable_stock', (SELECT COALESCE(SUM(quantity), 0) FROM assets WHERE asset_type = 'disposable'),
      'assigned_assets', (SELECT COUNT(*) FROM assets WHERE status = 'assigned'),
      'available_assets', (SELECT COUNT(*) FROM assets WHERE status = 'available'),
      'low_stock_count', (SELECT COUNT(*) FROM assets WHERE asset_type = 'disposable' AND quantity <= minimum_stock_level),
      'open_maintenance', (SELECT COUNT(*) FROM maintenance_records WHERE status IN ('open', 'in_progress')),
      'pending_requests', (SELECT COUNT(*) FROM requests WHERE status = 'pending')
    ) INTO result;
  ELSE
    emp_id := private.employee_id_for_user();
    SELECT jsonb_build_object(
      'total_assets', (SELECT COUNT(*) FROM asset_assignments WHERE employee_id = emp_id AND returned_date IS NULL),
      'permanent_assets', (
        SELECT COUNT(*) FROM asset_assignments aa
        JOIN assets a ON a.id = aa.asset_id
        WHERE aa.employee_id = emp_id AND aa.returned_date IS NULL AND a.asset_type = 'permanent'
      ),
      'disposable_stock', 0,
      'assigned_assets', (SELECT COUNT(*) FROM asset_assignments WHERE employee_id = emp_id AND returned_date IS NULL),
      'available_assets', 0,
      'low_stock_count', 0,
      'open_maintenance', (
        SELECT COUNT(*) FROM maintenance_records mr
        WHERE mr.status IN ('open', 'in_progress') AND (
          mr.reported_by = auth.uid()
          OR mr.asset_id IN (SELECT asset_id FROM asset_assignments WHERE employee_id = emp_id AND returned_date IS NULL)
        )
      ),
      'pending_requests', (SELECT COUNT(*) FROM requests WHERE employee_id = emp_id AND status = 'pending')
    ) INTO result;
  END IF;
  RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;
