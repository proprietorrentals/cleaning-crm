-- Fix employee invite permissions and tenant_id setup
-- Ensures existing admins can invite employees and all employees are properly tenant-scoped
-- Idempotent: safe to run multiple times

-- ─── ENSURE ALL EMPLOYEES HAVE tenant_id ──────────────────────────────────────

-- Set tenant_id to default for any employees missing it
update public.employees
set tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
where tenant_id is null;

-- ─── BACKFILL EMPLOYEE IS_ACTIVE FROM STATUS ──────────────────────────────────

-- Sync is_active with status for consistency
update public.employees
set is_active = (status::text != 'Inactive')
where is_active is distinct from (status::text != 'Inactive');

update public.employees
set status = case when is_active then 'Active' else 'Inactive' end
where is_active is distinct from (status::text != 'Inactive');

-- ─── MIGRATE EXISTING ADMINS TO tenant_admins (SAFE UPSERT) ────────────────────

-- For any auth user who is:
-- 1. NOT linked to a customer (old admin check)
-- 2. NOT already in tenant_admins
-- Add them as tenant_admin for the default tenant
insert into public.tenant_admins (tenant_id, auth_user_id, email)
select
  '00000000-0000-0000-0000-000000000001'::uuid as tenant_id,
  au.id as auth_user_id,
  au.email
from auth.users au
where not exists (
  select 1 from public.customers c where c.user_id = au.id
)
and not exists (
  select 1 from public.employees e where e.auth_user_id = au.id
)
and not exists (
  select 1 from public.super_admins sa where sa.auth_user_id = au.id
)
and not exists (
  select 1 from public.tenant_admins ta where ta.auth_user_id = au.id
)
on conflict (auth_user_id) do nothing;
