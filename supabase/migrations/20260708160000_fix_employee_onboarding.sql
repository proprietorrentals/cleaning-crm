-- Comprehensive Employee Onboarding Flow Fix
-- Addresses admin permissions, tenant setup, and auth linking
-- Idempotent: safe to run multiple times

-- ─── 1. ENSURE DEFAULT TENANT EXISTS ──────────────────────────────────────────

insert into public.tenants (id, company_name, owner_email, slug, plan, status)
values (
  '00000000-0000-0000-0000-000000000001',
  'Default Company',
  'admin@localhost',
  'default',
  'professional',
  'active'
)
on conflict (id) do update
  set slug = coalesce(public.tenants.slug, excluded.slug);

-- ─── 2. ENSURE ALL EMPLOYEES HAVE tenant_id SET ────────────────────────────────

update public.employees
set tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
where tenant_id is null;

-- ─── 3. SYNC is_active ↔ status FIELDS ────────────────────────────────────────

-- If status is "Inactive", make sure is_active is false
update public.employees
set is_active = false
where status::text = 'Inactive' and is_active != false;

-- If status is NOT "Inactive", make sure is_active is true
update public.employees
set is_active = true
where status::text != 'Inactive' and is_active != true;

-- ─── 4. MIGRATE EXISTING ADMINS TO tenant_admins ──────────────────────────────
-- For any auth.users who are:
--   1. NOT in customers table (not a customer)
--   2. NOT in employees table as auth_user_id (not an employee)
--   3. NOT in super_admins table (not a super admin)
--   4. NOT already in tenant_admins (not already migrated)
-- Add them to tenant_admins for the default tenant (they are legacy admins)

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

-- ─── 5. ADD INDEXES FOR PERFORMANCE ──────────────────────────────────────────

create index if not exists tenant_admins_auth_user_id_idx 
  on public.tenant_admins(auth_user_id);

create index if not exists employees_auth_user_id_tenant_idx 
  on public.employees(auth_user_id, tenant_id);

create index if not exists employees_is_active_idx 
  on public.employees(is_active);

-- ─── 6. VERIFY RLS IS ENABLED ─────────────────────────────────────────────────

alter table public.tenant_admins enable row level security;
alter table public.employees enable row level security;

-- ─── NOTES ────────────────────────────────────────────────────────────────────
-- After this migration:
-- - All existing admins should be in tenant_admins for the default tenant
-- - All employees should have tenant_id set to the default tenant
-- - All is_active/status fields should be synced
-- - Admin users can now invite employees successfully
-- - Employee auth_user_id will be populated when invited
