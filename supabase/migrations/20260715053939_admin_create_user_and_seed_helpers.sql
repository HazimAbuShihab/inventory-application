-- Admin function to create auth user + profile (super_admin only)
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role_name TEXT,
  p_phone TEXT DEFAULT NULL,
  p_department_id UUID DEFAULT NULL,
  p_employee_number TEXT DEFAULT NULL,
  p_job_title TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  new_id UUID := gen_random_uuid();
  role_uuid UUID;
BEGIN
  IF NOT private.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can create users';
  END IF;

  SELECT id INTO role_uuid FROM public.roles WHERE name = p_role_name;
  IF role_uuid IS NULL THEN
    RAISE EXCEPTION 'Invalid role: %', p_role_name;
  END IF;

  IF p_role_name = 'super_admin' AND private.current_role() <> 'super_admin' THEN
    RAISE EXCEPTION 'Cannot create super admin';
  END IF;

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_id,
    'authenticated',
    'authenticated',
    lower(p_email),
    crypt(p_password, gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email'], 'role', p_role_name),
    jsonb_build_object('full_name', p_full_name),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    new_id,
    jsonb_build_object('sub', new_id::text, 'email', lower(p_email)),
    'email',
    new_id::text,
    now(),
    now(),
    now()
  );

  -- Trigger may have created users row; upsert profile fields
  INSERT INTO public.users (id, full_name, email, phone, role_id, department_id, status)
  VALUES (new_id, p_full_name, lower(p_email), p_phone, role_uuid, p_department_id, 'active')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    role_id = EXCLUDED.role_id,
    department_id = EXCLUDED.department_id;

  IF p_employee_number IS NOT NULL THEN
    INSERT INTO public.employees (user_id, employee_number, job_title, department_id, joining_date, status)
    VALUES (new_id, p_employee_number, p_job_title, p_department_id, CURRENT_DATE, 'active');
  END IF;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_user FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_user TO authenticated;

-- Allow authenticated to read own role via JWT helper already exists
