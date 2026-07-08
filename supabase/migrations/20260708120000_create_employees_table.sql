-- Create employees table and wire it into the rest of the schema.
-- Idempotent: safe to run against a database that already has these objects.

-- ─── EMPLOYEES TABLE ──────────────────────────────────────────────────────────

create table if not exists public.employees (
  id            uuid        primary key default gen_random_uuid(),
  first_name    text        not null,
  last_name     text        not null,
  email         text        not null,
  phone         text,
  role          text        not null default 'Technician',
  department    text,
  hire_date     date,
  status        text        not null default 'Active',
  notes         text,
  auth_user_id  uuid        unique references auth.users(id) on delete set null,
  is_active     boolean     not null default true,
  created_at    timestamptz default now()
);

-- Add columns that may be missing on databases created before this migration.
alter table public.employees
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;

alter table public.employees
  add column if not exists is_active boolean not null default true;

alter table public.employees
  alter column status set default 'Active';

-- ─── INDEXES ─────────────────────────────────────────────────────────────────

create index if not exists employees_auth_user_id_idx on public.employees(auth_user_id);
create index if not exists employees_is_active_idx    on public.employees(is_active);

-- ─── SYNC status / is_active ON EXISTING ROWS ────────────────────────────────

update public.employees
set is_active = case when lower(coalesce(status, '')) = 'inactive' then false else true end
where is_active is distinct from
      case when lower(coalesce(status, '')) = 'inactive' then false else true end;

update public.employees
set status = case when is_active then coalesce(nullif(status, ''), 'Active') else 'Inactive' end;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.employees enable row level security;

-- ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────

-- Returns the employees.id that belongs to the currently authenticated user,
-- or NULL if the user is not a linked, active employee.
create or replace function public.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.id
  from   public.employees as e
  where  e.auth_user_id = auth.uid()
    and  e.is_active = true
  limit  1;
$$;

-- Convenience wrapper: true when the session belongs to an active employee.
create or replace function public.is_active_employee()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_employee_id() is not null;
$$;

-- ─── EMPLOYEES RLS POLICIES ──────────────────────────────────────────────────

-- Remove any old permissive catch-all policies.
drop policy if exists "Anyone can view employees"   on public.employees;
drop policy if exists "Anyone can insert employees" on public.employees;
drop policy if exists "Anyone can update employees" on public.employees;
drop policy if exists "Anyone can delete employees" on public.employees;

-- Remove previous named policies so we can recreate them cleanly.
drop policy if exists "Admins view all employees"   on public.employees;
drop policy if exists "Admins insert employees"     on public.employees;
drop policy if exists "Admins update employees"     on public.employees;
drop policy if exists "Admins delete employees"     on public.employees;
drop policy if exists "Employees view own profile"  on public.employees;

create policy "Admins view all employees" on public.employees
  for select
  using (public.is_admin());

create policy "Admins insert employees" on public.employees
  for insert
  with check (public.is_admin());

create policy "Admins update employees" on public.employees
  for update
  using  (public.is_admin())
  with check (public.is_admin());

create policy "Admins delete employees" on public.employees
  for delete
  using (public.is_admin());

-- Active employees can read their own profile row.
create policy "Employees view own profile" on public.employees
  for select
  using (
    auth.uid() is not null
    and auth.uid() = auth_user_id
    and is_active = true
  );

-- ─── JOBS: assigned_employee_id COLUMN ───────────────────────────────────────

alter table public.jobs
  add column if not exists assigned_employee_id uuid
  references public.employees(id) on delete set null;

create index if not exists jobs_assigned_employee_id_idx
  on public.jobs(assigned_employee_id);

-- Backfill the FK where the legacy text field matches a full name.
update public.jobs as j
set    assigned_employee_id = e.id
from   public.employees as e
where  j.assigned_employee_id is null
  and  lower(trim(coalesce(j.assigned_employee, '')))
       = lower(trim(e.first_name || ' ' || e.last_name));

-- ─── JOBS RLS POLICIES (includes employee scope) ─────────────────────────────

-- Drop all existing jobs policies so we can lay them down cleanly.
drop policy if exists "Anyone can view jobs"              on public.jobs;
drop policy if exists "Anyone can insert jobs"            on public.jobs;
drop policy if exists "Anyone can update jobs"            on public.jobs;
drop policy if exists "Anyone can delete jobs"            on public.jobs;

drop policy if exists "Customers view own jobs"           on public.jobs;
drop policy if exists "Admins view all jobs"              on public.jobs;
drop policy if exists "Admins insert jobs"                on public.jobs;
drop policy if exists "Admins update jobs"                on public.jobs;
drop policy if exists "Admins delete jobs"                on public.jobs;
drop policy if exists "Internal staff view all jobs"      on public.jobs;
drop policy if exists "Internal staff insert jobs"        on public.jobs;
drop policy if exists "Internal staff update jobs"        on public.jobs;
drop policy if exists "Internal staff delete jobs"        on public.jobs;
drop policy if exists "Employees view assigned jobs"      on public.jobs;

-- Customers see only jobs that belong to their account.
create policy "Customers view own jobs" on public.jobs
  for select
  using (
    customer_id in (
      select id from public.customers where auth.uid() = user_id
    )
  );

-- Admins have full access.
create policy "Admins view all jobs" on public.jobs
  for select
  using (public.is_admin());

create policy "Admins insert jobs" on public.jobs
  for insert
  with check (public.is_admin());

create policy "Admins update jobs" on public.jobs
  for update
  using  (public.is_admin())
  with check (public.is_admin());

create policy "Admins delete jobs" on public.jobs
  for delete
  using (public.is_admin());

-- Active employees see only jobs assigned to them.
create policy "Employees view assigned jobs" on public.jobs
  for select
  using (
    public.is_active_employee()
    and assigned_employee_id = public.current_employee_id()
  );
