CREATE OR REPLACE FUNCTION public.admin_update_user(
  p_user_id uuid,
  p_role_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_full_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  updated_row public.users;
  new_role_name text;
  next_email text;
BEGIN
  IF NOT private.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can update users';
  END IF;

  IF p_status IS NOT NULL AND p_status NOT IN ('active', 'inactive', 'suspended') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  IF p_role_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.roles WHERE id = p_role_id) THEN
    RAISE EXCEPTION 'Invalid role id';
  END IF;

  IF p_full_name IS NOT NULL AND length(trim(p_full_name)) < 2 THEN
    RAISE EXCEPTION 'Full name must be at least 2 characters';
  END IF;

  IF p_email IS NOT NULL THEN
    next_email := lower(trim(p_email));
    IF next_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid email address';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.users
      WHERE lower(email) = next_email AND id <> p_user_id
    ) THEN
      RAISE EXCEPTION 'A user with this email already exists';
    END IF;
  END IF;

  UPDATE public.users
  SET
    role_id = COALESCE(p_role_id, role_id),
    status = COALESCE(p_status, status),
    full_name = COALESCE(NULLIF(trim(p_full_name), ''), full_name),
    email = COALESCE(next_email, email),
    phone = CASE
      WHEN p_phone IS NULL THEN phone
      WHEN trim(p_phone) = '' THEN NULL
      ELSE trim(p_phone)
    END,
    updated_at = now()
  WHERE id = p_user_id
  RETURNING * INTO updated_row;

  IF updated_row.id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Sync auth.users when email or role changes
  IF p_email IS NOT NULL OR p_role_id IS NOT NULL OR p_full_name IS NOT NULL THEN
    IF p_role_id IS NOT NULL THEN
      SELECT name INTO new_role_name FROM public.roles WHERE id = p_role_id;
    END IF;

    UPDATE auth.users
    SET
      email = COALESCE(next_email, email),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
        || CASE
          WHEN p_full_name IS NOT NULL THEN jsonb_build_object('full_name', trim(p_full_name))
          ELSE '{}'::jsonb
        END,
      raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
        || CASE
          WHEN new_role_name IS NOT NULL THEN jsonb_build_object('role', new_role_name)
          ELSE '{}'::jsonb
        END,
      updated_at = now()
    WHERE id = p_user_id;

    IF next_email IS NOT NULL THEN
      UPDATE auth.identities
      SET
        identity_data = COALESCE(identity_data, '{}'::jsonb)
          || jsonb_build_object('email', next_email, 'sub', p_user_id::text),
        provider_id = CASE WHEN provider = 'email' THEN p_user_id::text ELSE provider_id END,
        updated_at = now()
      WHERE user_id = p_user_id AND provider = 'email';
    END IF;
  END IF;

  RETURN updated_row;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_update_user(uuid, uuid, text, text, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_update_user(uuid, uuid, text, text, text, text) FROM PUBLIC, anon;
