-- DEMO SEED — replace the CHANGE-ME-BEFORE-RUNNING password below with a strong
-- throwaway value before executing, and rotate/remove these accounts before production.

-- Seed additional role demo users if missing
DO $$
DECLARE
  fac_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5';
  hr_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6';
  fac_role UUID;
  hr_role UUID;
  it_dept UUID;
  hr_dept UUID;
BEGIN
  SELECT id INTO fac_role FROM public.roles WHERE name = 'facilities_admin';
  SELECT id INTO hr_role FROM public.roles WHERE name = 'hr';
  SELECT id INTO it_dept FROM public.departments WHERE name = 'IT' LIMIT 1;
  SELECT id INTO hr_dept FROM public.departments WHERE name = 'Human Resources' LIMIT 1;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'facilities@company.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', fac_id, 'authenticated', 'authenticated',
      'facilities@company.com', crypt('CHANGE-ME-BEFORE-RUNNING', gen_salt('bf')), now(),
      jsonb_build_object('provider','email','providers',ARRAY['email'],'role','facilities_admin'),
      jsonb_build_object('full_name','Facilities Manager'),
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), fac_id, jsonb_build_object('sub', fac_id::text, 'email', 'facilities@company.com'), 'email', fac_id::text, now(), now(), now());
  ELSE
    SELECT id INTO fac_id FROM auth.users WHERE email = 'facilities@company.com';
  END IF;

  UPDATE public.users SET full_name='Facilities Manager', role_id=fac_role, department_id=it_dept WHERE id=fac_id;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'hr@company.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', hr_id, 'authenticated', 'authenticated',
      'hr@company.com', crypt('CHANGE-ME-BEFORE-RUNNING', gen_salt('bf')), now(),
      jsonb_build_object('provider','email','providers',ARRAY['email'],'role','hr'),
      jsonb_build_object('full_name','HR Manager'),
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), hr_id, jsonb_build_object('sub', hr_id::text, 'email', 'hr@company.com'), 'email', hr_id::text, now(), now(), now());
  ELSE
    SELECT id INTO hr_id FROM auth.users WHERE email = 'hr@company.com';
  END IF;

  UPDATE public.users SET full_name='HR Manager', role_id=hr_role, department_id=hr_dept WHERE id=hr_id;

  -- Rename inventory demo account display if still mapped
  UPDATE public.users SET full_name = COALESCE(full_name, 'IT Administrator')
  WHERE email = 'inventory@company.com';

  -- Sample subcategory
  INSERT INTO public.asset_subcategories (category_id, name, description)
  SELECT c.id, 'MacBook', 'Apple laptops'
  FROM public.asset_categories c WHERE c.name = 'Laptop'
  ON CONFLICT (category_id, name) DO NOTHING;

  -- Sample distribution if disposable exists
  INSERT INTO public.distributions (asset_id, department_id, quantity, notes, distributed_by)
  SELECT a.id, d.id, 2, 'Office restock', u.id
  FROM public.assets a
  CROSS JOIN public.departments d
  CROSS JOIN public.users u
  WHERE a.asset_code = 'AST-OS-001' AND d.name = 'Human Resources' AND u.email = 'inventory@company.com'
    AND NOT EXISTS (SELECT 1 FROM public.distributions WHERE notes = 'Office restock')
  LIMIT 1;
END $$;
