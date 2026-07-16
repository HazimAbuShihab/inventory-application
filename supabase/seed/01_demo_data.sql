-- DEMO SEED — replace the CHANGE-ME-BEFORE-RUNNING password below with a strong
-- throwaway value before executing, and rotate/remove these accounts before production.

-- Seed departments, categories, and demo auth users with sample inventory

INSERT INTO public.departments (id, name, description) VALUES
  ('11111111-1111-1111-1111-111111111001', 'IT', 'Information Technology'),
  ('11111111-1111-1111-1111-111111111002', 'Human Resources', 'HR and people operations'),
  ('11111111-1111-1111-1111-111111111003', 'Finance', 'Accounting and finance'),
  ('11111111-1111-1111-1111-111111111004', 'Operations', 'Facilities and operations')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.asset_categories (id, name, description, asset_type) VALUES
  ('22222222-2222-2222-2222-222222222001', 'Laptop', 'Company laptops', 'permanent'),
  ('22222222-2222-2222-2222-222222222002', 'Monitor', 'Display monitors', 'permanent'),
  ('22222222-2222-2222-2222-222222222003', 'Mobile Phone', 'Company mobile devices', 'permanent'),
  ('22222222-2222-2222-2222-222222222004', 'Network Equipment', 'Routers, switches, APs', 'permanent'),
  ('22222222-2222-2222-2222-222222222005', 'Cables', 'Network and power cables', 'disposable'),
  ('22222222-2222-2222-2222-222222222006', 'Office Supplies', 'Stationery and consumables', 'disposable'),
  ('22222222-2222-2222-2222-222222222007', 'Accessories', 'Keyboards, mice, adapters', 'disposable')
ON CONFLICT (name) DO NOTHING;

-- Create demo auth users if missing
DO $$
DECLARE
  admin_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
  inv_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2';
  emp_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3';
  emp2_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4';
  super_role UUID;
  inv_role UUID;
  emp_role UUID;
  it_dept UUID := '11111111-1111-1111-1111-111111111001';
  hr_dept UUID := '11111111-1111-1111-1111-111111111002';
BEGIN
  SELECT id INTO super_role FROM public.roles WHERE name = 'super_admin';
  SELECT id INTO inv_role FROM public.roles WHERE name = 'inventory_admin';
  SELECT id INTO emp_role FROM public.roles WHERE name = 'employee';

  -- Super Admin
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@company.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', admin_id, 'authenticated', 'authenticated',
      'admin@company.com', crypt('CHANGE-ME-BEFORE-RUNNING', gen_salt('bf')), now(),
      jsonb_build_object('provider','email','providers',ARRAY['email'],'role','super_admin'),
      jsonb_build_object('full_name','System Administrator'),
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), admin_id, jsonb_build_object('sub', admin_id::text, 'email', 'admin@company.com'), 'email', admin_id::text, now(), now(), now());
  ELSE
    SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@company.com';
  END IF;

  UPDATE public.users SET
    full_name = 'System Administrator',
    role_id = super_role,
    department_id = it_dept,
    phone = '+1-555-0100'
  WHERE id = admin_id;

  -- Inventory Admin
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'inventory@company.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', inv_id, 'authenticated', 'authenticated',
      'inventory@company.com', crypt('CHANGE-ME-BEFORE-RUNNING', gen_salt('bf')), now(),
      jsonb_build_object('provider','email','providers',ARRAY['email'],'role','inventory_admin'),
      jsonb_build_object('full_name','Inventory Manager'),
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), inv_id, jsonb_build_object('sub', inv_id::text, 'email', 'inventory@company.com'), 'email', inv_id::text, now(), now(), now());
  ELSE
    SELECT id INTO inv_id FROM auth.users WHERE email = 'inventory@company.com';
  END IF;

  UPDATE public.users SET
    full_name = 'Inventory Manager',
    role_id = inv_role,
    department_id = it_dept,
    phone = '+1-555-0101'
  WHERE id = inv_id;

  -- Employee 1
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'employee@company.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', emp_id, 'authenticated', 'authenticated',
      'employee@company.com', crypt('CHANGE-ME-BEFORE-RUNNING', gen_salt('bf')), now(),
      jsonb_build_object('provider','email','providers',ARRAY['email'],'role','employee'),
      jsonb_build_object('full_name','Alex Employee'),
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), emp_id, jsonb_build_object('sub', emp_id::text, 'email', 'employee@company.com'), 'email', emp_id::text, now(), now(), now());
  ELSE
    SELECT id INTO emp_id FROM auth.users WHERE email = 'employee@company.com';
  END IF;

  UPDATE public.users SET
    full_name = 'Alex Employee',
    role_id = emp_role,
    department_id = it_dept,
    phone = '+1-555-0102'
  WHERE id = emp_id;

  -- Employee 2
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'jane@company.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', emp2_id, 'authenticated', 'authenticated',
      'jane@company.com', crypt('CHANGE-ME-BEFORE-RUNNING', gen_salt('bf')), now(),
      jsonb_build_object('provider','email','providers',ARRAY['email'],'role','employee'),
      jsonb_build_object('full_name','Jane Doe'),
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), emp2_id, jsonb_build_object('sub', emp2_id::text, 'email', 'jane@company.com'), 'email', emp2_id::text, now(), now(), now());
  ELSE
    SELECT id INTO emp2_id FROM auth.users WHERE email = 'jane@company.com';
  END IF;

  UPDATE public.users SET
    full_name = 'Jane Doe',
    role_id = emp_role,
    department_id = hr_dept,
    phone = '+1-555-0103'
  WHERE id = emp2_id;

  -- Employees records
  INSERT INTO public.employees (user_id, employee_number, job_title, department_id, joining_date, status)
  VALUES
    (emp_id, 'EMP-001', 'Software Engineer', it_dept, '2024-01-15', 'active'),
    (emp2_id, 'EMP-002', 'HR Specialist', hr_dept, '2023-06-01', 'active'),
    (inv_id, 'EMP-INV-01', 'Inventory Manager', it_dept, '2022-03-10', 'active')
  ON CONFLICT (user_id) DO NOTHING;

  -- Sample assets
  INSERT INTO public.assets (id, asset_code, name, description, category_id, asset_type, serial_number, manufacturer, model, purchase_date, purchase_price, warranty_expiry, supplier, status, location, quantity, minimum_stock_level, created_by)
  VALUES
    ('33333333-3333-3333-3333-333333333001', 'AST-LT-001', 'MacBook Pro 14', 'Primary engineering laptop', '22222222-2222-2222-2222-222222222001', 'permanent', 'MBP14-SN-001', 'Apple', 'MacBook Pro 14', '2024-02-01', 2499, '2027-02-01', 'Apple Business', 'available', 'HQ-IT-Store', 1, 0, inv_id),
    ('33333333-3333-3333-3333-333333333002', 'AST-LT-002', 'Dell XPS 15', 'Design workstation laptop', '22222222-2222-2222-2222-222222222001', 'permanent', 'DXPS15-SN-002', 'Dell', 'XPS 15', '2024-03-15', 1899, '2027-03-15', 'Dell Business', 'available', 'HQ-IT-Store', 1, 0, inv_id),
    ('33333333-3333-3333-3333-333333333003', 'AST-MN-001', 'Dell UltraSharp 27', '4K monitor', '22222222-2222-2222-2222-222222222002', 'permanent', 'U2720Q-001', 'Dell', 'U2720Q', '2023-11-01', 549, '2026-11-01', 'Dell Business', 'available', 'HQ-Floor-2', 1, 0, inv_id),
    ('33333333-3333-3333-3333-333333333004', 'AST-PH-001', 'iPhone 15', 'Company mobile', '22222222-2222-2222-2222-222222222003', 'permanent', 'IPH15-001', 'Apple', 'iPhone 15', '2024-05-01', 899, '2026-05-01', 'Apple Business', 'available', 'HQ-IT-Store', 1, 0, inv_id),
    ('33333333-3333-3333-3333-333333333005', 'AST-NW-001', 'Cisco Switch 24p', 'Access switch', '22222222-2222-2222-2222-222222222004', 'permanent', 'CISCO-24-001', 'Cisco', 'Catalyst 9200', '2023-08-01', 3200, '2026-08-01', 'CDW', 'under_maintenance', 'Server Room', 1, 0, inv_id),
    ('33333333-3333-3333-3333-333333333006', 'AST-CB-001', 'Cat6 Patch Cables', '1m ethernet cables', '22222222-2222-2222-2222-222222222005', 'disposable', NULL, 'Generic', 'Cat6', '2024-06-01', 2.5, NULL, 'Amazon Business', 'available', 'HQ-IT-Store', 15, 20, inv_id),
    ('33333333-3333-3333-3333-333333333007', 'AST-OS-001', 'A4 Copy Paper', 'Office paper reams', '22222222-2222-2222-2222-222222222006', 'disposable', NULL, 'HP', 'Office Paper', '2024-07-01', 8.5, NULL, 'Staples', 'available', 'Supply Closet', 40, 10, inv_id),
    ('33333333-3333-3333-3333-333333333008', 'AST-AC-001', 'USB-C Hubs', 'Multiport hubs', '22222222-2222-2222-2222-222222222007', 'disposable', NULL, 'Anker', '7-in-1', '2024-04-01', 45, NULL, 'Anker', 'available', 'HQ-IT-Store', 8, 5, inv_id)
  ON CONFLICT (asset_code) DO NOTHING;

  -- Assignment for employee
  INSERT INTO public.asset_assignments (asset_id, employee_id, assigned_date, assigned_by, condition_before, notes)
  SELECT '33333333-3333-3333-3333-333333333002', e.id, CURRENT_DATE - 30, inv_id, 'Excellent', 'Assigned for design work'
  FROM public.employees e WHERE e.user_id = emp_id
  AND NOT EXISTS (
    SELECT 1 FROM public.asset_assignments aa
    WHERE aa.asset_id = '33333333-3333-3333-3333-333333333002' AND aa.returned_date IS NULL
  );

  -- Transactions
  INSERT INTO public.asset_transactions (asset_id, transaction_type, quantity, performed_by, notes)
  SELECT '33333333-3333-3333-3333-333333333006', 'stock_out', 5, inv_id, 'Issued to cabling project'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.asset_transactions WHERE asset_id = '33333333-3333-3333-3333-333333333006' AND notes = 'Issued to cabling project'
  );

  INSERT INTO public.asset_transactions (asset_id, transaction_type, quantity, performed_by, notes, from_location, to_location)
  SELECT '33333333-3333-3333-3333-333333333007', 'purchase', 20, inv_id, 'Restock order #PO-441', 'Vendor', 'Supply Closet'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.asset_transactions WHERE notes = 'Restock order #PO-441'
  );

  -- Maintenance
  INSERT INTO public.maintenance_records (asset_id, issue_description, status, maintenance_date, cost, notes, reported_by)
  SELECT '33333333-3333-3333-3333-333333333005', 'Port 12 failing intermittently', 'in_progress', CURRENT_DATE - 2, 150, 'Awaiting replacement module', inv_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.maintenance_records WHERE asset_id = '33333333-3333-3333-3333-333333333005'
  );

  -- Request
  INSERT INTO public.requests (employee_id, asset_category_id, quantity, reason, status)
  SELECT e.id, '22222222-2222-2222-2222-222222222001', 1, 'Need laptop for new project onboarding', 'pending'
  FROM public.employees e WHERE e.user_id = emp_id
  AND NOT EXISTS (
    SELECT 1 FROM public.requests r
    JOIN public.employees e2 ON e2.id = r.employee_id
    WHERE e2.user_id = emp_id AND r.reason LIKE 'Need laptop%'
  );

END $$;
