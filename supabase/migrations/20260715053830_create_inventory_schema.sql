-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Roles
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Departments
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users (1:1 with auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role_id UUID NOT NULL REFERENCES public.roles(id),
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Employees
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  employee_number TEXT NOT NULL UNIQUE,
  job_title TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  joining_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Asset categories
CREATE TABLE public.asset_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('permanent', 'disposable')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assets
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.asset_categories(id) ON DELETE SET NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('permanent', 'disposable')),
  serial_number TEXT,
  manufacturer TEXT,
  model TEXT,
  purchase_date DATE,
  purchase_price NUMERIC(12,2) CHECK (purchase_price IS NULL OR purchase_price >= 0),
  warranty_expiry DATE,
  supplier TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'under_maintenance', 'lost', 'damaged', 'retired')),
  location TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  minimum_stock_level INTEGER NOT NULL DEFAULT 0 CHECK (minimum_stock_level >= 0),
  image_path TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Asset assignments
CREATE TABLE public.asset_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  returned_date DATE,
  assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  condition_before TEXT,
  condition_after TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_return_date CHECK (returned_date IS NULL OR returned_date >= assigned_date)
);

-- Asset transactions
CREATE TABLE public.asset_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'assignment', 'return', 'disposal', 'adjustment', 'stock_in', 'stock_out')),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  from_location TEXT,
  to_location TEXT,
  performed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Maintenance records
CREATE TABLE public.maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  issue_description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  maintenance_date DATE,
  cost NUMERIC(12,2) CHECK (cost IS NULL OR cost >= 0),
  notes TEXT,
  reported_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Requests
CREATE TABLE public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  asset_category_id UUID REFERENCES public.asset_categories(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled', 'cancelled')),
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_users_role_id ON public.users(role_id);
CREATE INDEX idx_users_department_id ON public.users(department_id);
CREATE INDEX idx_users_status ON public.users(status);
CREATE INDEX idx_employees_department_id ON public.employees(department_id);
CREATE INDEX idx_employees_user_id ON public.employees(user_id);
CREATE INDEX idx_assets_category_id ON public.assets(category_id);
CREATE INDEX idx_assets_asset_type ON public.assets(asset_type);
CREATE INDEX idx_assets_status ON public.assets(status);
CREATE INDEX idx_assets_created_by ON public.assets(created_by);
CREATE INDEX idx_assets_asset_code ON public.assets(asset_code);
CREATE INDEX idx_asset_assignments_asset_id ON public.asset_assignments(asset_id);
CREATE INDEX idx_asset_assignments_employee_id ON public.asset_assignments(employee_id);
CREATE INDEX idx_asset_assignments_active ON public.asset_assignments(asset_id) WHERE returned_date IS NULL;
CREATE INDEX idx_asset_transactions_asset_id ON public.asset_transactions(asset_id);
CREATE INDEX idx_asset_transactions_type ON public.asset_transactions(transaction_type);
CREATE INDEX idx_maintenance_asset_id ON public.maintenance_records(asset_id);
CREATE INDEX idx_maintenance_status ON public.maintenance_records(status);
CREATE INDEX idx_requests_employee_id ON public.requests(employee_id);
CREATE INDEX idx_requests_status ON public.requests(status);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity, entity_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_assets_low_stock ON public.assets(id) WHERE asset_type = 'disposable' AND quantity <= minimum_stock_level;

-- Seed roles
INSERT INTO public.roles (name, description) VALUES
  ('super_admin', 'Full system access including user management'),
  ('inventory_admin', 'Manage assets, assignments, categories, and suppliers'),
  ('employee', 'View assigned assets and submit requests');
