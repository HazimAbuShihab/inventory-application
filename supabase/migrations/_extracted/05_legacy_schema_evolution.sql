-- ============================================================
-- Legacy business rules schema evolution
-- ============================================================

-- 1) New roles
INSERT INTO public.roles (name, description) VALUES
  ('it_admin', 'Manage IT-domain assets, assignments, and categories'),
  ('facilities_admin', 'Manage Facilities-domain assets, locations, and assignments'),
  ('hr', 'Manage employees and HR coverage reports')
ON CONFLICT (name) DO NOTHING;

-- Remap inventory_admin users -> it_admin (keep inventory_admin row for compatibility)
UPDATE public.users u
SET role_id = (SELECT id FROM public.roles WHERE name = 'it_admin')
WHERE u.role_id = (SELECT id FROM public.roles WHERE name = 'inventory_admin');

-- 2) Locations
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building TEXT NOT NULL,
  floor INTEGER NOT NULL DEFAULT 0 CHECK (floor >= 0),
  room TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT locations_building_floor_room_unique UNIQUE (building, floor, room)
);

CREATE INDEX IF NOT EXISTS idx_locations_is_active ON public.locations(is_active);

-- 3) Category domain + soft flags
ALTER TABLE public.asset_categories
  ADD COLUMN IF NOT EXISTS domain TEXT NOT NULL DEFAULT 'it',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS icon_name TEXT;

ALTER TABLE public.asset_categories DROP CONSTRAINT IF EXISTS asset_categories_domain_check;
ALTER TABLE public.asset_categories
  ADD CONSTRAINT asset_categories_domain_check CHECK (domain IN ('it', 'facilities'));

-- Heuristic: disposable + office-ish names -> facilities for some; keep IT for tech
UPDATE public.asset_categories SET domain = 'facilities'
WHERE lower(name) IN ('office supplies', 'monitor') OR lower(name) LIKE '%furniture%';

CREATE INDEX IF NOT EXISTS idx_asset_categories_domain ON public.asset_categories(domain);

-- 4) Subcategories
CREATE TABLE IF NOT EXISTS public.asset_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.asset_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT asset_subcategories_category_name_unique UNIQUE (category_id, name)
);

CREATE INDEX IF NOT EXISTS idx_asset_subcategories_category ON public.asset_subcategories(category_id);

-- 5) Assets legacy fields
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES public.asset_subcategories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS barcode TEXT,
  ADD COLUMN IF NOT EXISTS condition TEXT NOT NULL DEFAULT 'good',
  ADD COLUMN IF NOT EXISTS useful_life_years INTEGER CHECK (useful_life_years IS NULL OR useful_life_years BETWEEN 1 AND 100),
  ADD COLUMN IF NOT EXISTS salvage_value NUMERIC(12,2) CHECK (salvage_value IS NULL OR salvage_value >= 0),
  ADD COLUMN IF NOT EXISTS operating_system TEXT,
  ADD COLUMN IF NOT EXISTS purpose TEXT;

ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_condition_check;
ALTER TABLE public.assets
  ADD CONSTRAINT assets_condition_check
  CHECK (condition IN ('very_bad', 'bad', 'low', 'good', 'very_good', 'new'));

CREATE INDEX IF NOT EXISTS idx_assets_barcode ON public.assets(barcode);
CREATE INDEX IF NOT EXISTS idx_assets_subcategory ON public.assets(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_assets_warranty ON public.assets(warranty_expiry);

-- 6) Assignments: location, expected return, is_active
ALTER TABLE public.asset_assignments
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS expected_return_date DATE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Backfill is_active from returned_date
UPDATE public.asset_assignments
SET is_active = (returned_date IS NULL)
WHERE is_active IS DISTINCT FROM (returned_date IS NULL);

CREATE UNIQUE INDEX IF NOT EXISTS ix_assignments_asset_active_unique
  ON public.asset_assignments(asset_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_asset_assignments_location ON public.asset_assignments(location_id);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_expected ON public.asset_assignments(expected_return_date);

-- Sync is_active when returned_date set
CREATE OR REPLACE FUNCTION private.sync_assignment_is_active()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.returned_date IS NOT NULL THEN
    NEW.is_active := false;
  ELSIF TG_OP = 'INSERT' THEN
    NEW.is_active := COALESCE(NEW.is_active, true);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assignment_is_active ON public.asset_assignments;
CREATE TRIGGER trg_assignment_is_active
  BEFORE INSERT OR UPDATE OF returned_date ON public.asset_assignments
  FOR EACH ROW EXECUTE FUNCTION private.sync_assignment_is_active();

-- 7) Employees + departments soft flags / work location
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS work_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS end_date DATE;

UPDATE public.employees SET is_active = (status = 'active') WHERE is_active IS DISTINCT FROM (status = 'active');

ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_employees_is_active ON public.employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_work_location ON public.employees(work_location_id);

-- Deactivate employee guard
CREATE OR REPLACE FUNCTION public.deactivate_employee(p_employee_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (private.is_super_admin() OR private.current_role() = 'hr' OR private.is_inventory_admin()) THEN
    RAISE EXCEPTION 'Not authorized to deactivate employees';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.asset_assignments
    WHERE employee_id = p_employee_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Cannot deactivate employee with active asset assignments';
  END IF;

  UPDATE public.employees
  SET is_active = false, status = 'inactive', end_date = CURRENT_DATE
  WHERE id = p_employee_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_employee(p_employee_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (private.is_super_admin() OR private.current_role() = 'hr' OR private.is_inventory_admin()) THEN
    RAISE EXCEPTION 'Not authorized to activate employees';
  END IF;

  UPDATE public.employees
  SET is_active = true, status = 'active', end_date = NULL
  WHERE id = p_employee_id;
END;
$$;

REVOKE ALL ON FUNCTION public.deactivate_employee(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.activate_employee(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deactivate_employee(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_employee(UUID) TO authenticated;

-- Auto employee number helper
CREATE OR REPLACE FUNCTION public.next_employee_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  yy TEXT := to_char(CURRENT_DATE, 'YY');
  seq INT;
  candidate TEXT;
BEGIN
  SELECT COALESCE(MAX(
    CASE WHEN employee_number ~ ('^EMP' || yy || '[0-9]{3}$')
      THEN substring(employee_number from 6)::int ELSE 0 END
  ), 0) + 1 INTO seq FROM public.employees;
  candidate := 'EMP' || yy || lpad(seq::text, 3, '0');
  RETURN candidate;
END;
$$;

REVOKE ALL ON FUNCTION public.next_employee_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_employee_number() TO authenticated;

-- 8) Distributions for disposables
CREATE TABLE IF NOT EXISTS public.distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  notes TEXT,
  distributed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  distributed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT distributions_recipient_xor CHECK (
    (employee_id IS NOT NULL AND department_id IS NULL)
    OR (employee_id IS NULL AND department_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_distributions_asset ON public.distributions(asset_id);
CREATE INDEX IF NOT EXISTS idx_distributions_employee ON public.distributions(employee_id);
CREATE INDEX IF NOT EXISTS idx_distributions_department ON public.distributions(department_id);
CREATE INDEX IF NOT EXISTS idx_distributions_at ON public.distributions(distributed_at DESC);

CREATE OR REPLACE FUNCTION private.apply_distribution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a_type TEXT;
  a_qty INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT asset_type, quantity INTO a_type, a_qty FROM public.assets WHERE id = NEW.asset_id FOR UPDATE;
    IF a_type <> 'disposable' THEN
      RAISE EXCEPTION 'Distributions only allowed for disposable assets';
    END IF;
    IF NEW.quantity > a_qty THEN
      RAISE EXCEPTION 'Insufficient stock for distribution';
    END IF;
    UPDATE public.assets
    SET quantity = quantity - NEW.quantity, updated_at = now()
    WHERE id = NEW.asset_id;

    INSERT INTO public.asset_transactions (asset_id, transaction_type, quantity, performed_by, notes)
    VALUES (NEW.asset_id, 'stock_out', NEW.quantity, NEW.distributed_by, COALESCE(NEW.notes, 'Distribution'));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.assets
    SET quantity = quantity + OLD.quantity, updated_at = now()
    WHERE id = OLD.asset_id;

    INSERT INTO public.asset_transactions (asset_id, transaction_type, quantity, performed_by, notes)
    VALUES (OLD.asset_id, 'stock_in', OLD.quantity, auth.uid(), 'Reversed distribution');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Avoid double stock adjustment: disable quantity change from stock trigger for notes Distribution
-- Stock trigger still runs on transaction insert from apply_distribution — that would DOUBLE-count.
-- Fix: insert transaction AFTER quantity update but use a flag, OR skip stock trigger for notes starting with Distribution.

CREATE OR REPLACE FUNCTION private.adjust_stock_on_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a_type TEXT;
BEGIN
  -- Skip when distribution trigger already adjusted quantity
  IF NEW.notes ILIKE 'Distribution%' OR NEW.notes ILIKE 'Reversed distribution%' THEN
    RETURN NEW;
  END IF;

  SELECT asset_type INTO a_type FROM public.assets WHERE id = NEW.asset_id;
  IF a_type = 'disposable' THEN
    IF NEW.transaction_type IN ('purchase', 'stock_in') THEN
      UPDATE public.assets SET quantity = quantity + NEW.quantity, updated_at = now() WHERE id = NEW.asset_id;
    ELSIF NEW.transaction_type IN ('stock_out', 'disposal') THEN
      UPDATE public.assets SET quantity = GREATEST(0, quantity - NEW.quantity), updated_at = now() WHERE id = NEW.asset_id;
    ELSIF NEW.transaction_type = 'adjustment' THEN
      IF NEW.notes ILIKE 'decrease%' THEN
        UPDATE public.assets SET quantity = GREATEST(0, quantity - NEW.quantity), updated_at = now() WHERE id = NEW.asset_id;
      ELSE
        UPDATE public.assets SET quantity = quantity + NEW.quantity, updated_at = now() WHERE id = NEW.asset_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_distribution_apply ON public.distributions;
CREATE TRIGGER trg_distribution_apply
  AFTER INSERT OR DELETE ON public.distributions
  FOR EACH ROW EXECUTE FUNCTION private.apply_distribution();

CREATE TRIGGER trg_audit_distributions AFTER INSERT OR UPDATE OR DELETE ON public.distributions
  FOR EACH ROW EXECUTE FUNCTION private.write_audit_log();

CREATE TRIGGER trg_locations_updated_at BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed sample locations
INSERT INTO public.locations (building, floor, room, description)
VALUES
  ('HQ', 1, 'Store-A', 'IT storage'),
  ('HQ', 2, 'Open-Office', 'Floor 2 workspace'),
  ('HQ', 0, 'Server-Room', 'Network closet')
ON CONFLICT (building, floor, room) DO NOTHING;
