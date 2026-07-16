-- Inventory Management System schema
-- Applied via Supabase MCP as create_inventory_schema
-- Mirror file for local reference / supabase db push workflows

-- See remote migration history:
-- 20260714061229_create_inventory_schema
-- 20260714061333_add_rls_helpers_triggers
-- 20260714062023_admin_create_user_and_seed_helpers
-- 20260714062812_fix_security_advisors

-- Tables: roles, departments, users, employees, asset_categories, assets,
-- asset_assignments, asset_transactions, maintenance_records, requests, audit_logs
-- Plus RLS helpers in private schema, triggers, storage bucket asset-images,
-- RPCs: get_dashboard_stats, current_user_role, admin_create_user
