-- Phase 1 employee portal foundations: employee auth mapping, job assignment IDs, and RLS

-- Ensure employees table exists for environments that were created from docs instead of migrations.
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  role text not null default 'Technician',
  department text,
  hire_date date,
  status text not null default 'Active',
  notes text,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

alter table public.employees add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;
alter table public.employees add column if not exists is_active boolean not null default true;
alter table public.employees alter column status set default 'Active';

create index if not exists employees_auth_user_id_idx on public.employees(auth_user_id);
create index if not exists employees_is_active_idx on public.employees(is_active);

-- Keep boolean and status aligned for existing rows.
update public.employees
set is_active = case when lower(coalesce(status, '')) = 'inactive' then false else true end
where is_active is distinct from case when lower(coalesce(status, '')) = 'inactive' then false else true end;

update public.employees
set status = case when is_active then coalesce(nullif(status, ''), 'Active') else 'Inactive' end;

alter table public.employees enable row level security;

-- Jobs now track assigned employee by id for secure filtering.
alter table public.jobs add column if not exists assigned_employee_id uuid references public.employees(id) on delete set null;
create index if not exists jobs_assigned_employee_id_idx on public.jobs(assigned_employee_id);

-- Backfill assignment IDs where the text name matches first + last name.
update public.jobs as j
set assigned_employee_id = e.id
from public.employees as e
where j.assigned_employee_id is null
  and lower(trim(coalesce(j.assigned_employee, ''))) = lower(trim(e.first_name || ' ' || e.last_name));

-- Helper functions used by policies.
create or replace function public.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.id
  from public.employees as e
  where e.auth_user_id = auth.uid()
    and e.is_active = true
  limit 1;
$$;

create or replace function public.is_active_employee()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_employee_id() is not null;
$$;

-- Remove old permissive employee policies if they exist.
drop policy if exists "Anyone can view employees" on public.employees;
drop policy if exists "Anyone can insert employees" on public.employees;
drop policy if exists "Anyone can update employees" on public.employees;
drop policy if exists "Anyone can delete employees" on public.employees;

-- Employee table policies.
drop policy if exists "Admins view all employees" on public.employees;
drop policy if exists "Admins insert employees" on public.employees;
drop policy if exists "Admins update employees" on public.employees;
drop policy if exists "Admins delete employees" on public.employees;
drop policy if exists "Employees view own profile" on public.employees;

create policy "Admins view all employees" on public.employees
  for select
  using (public.is_admin());

create policy "Admins insert employees" on public.employees
  for insert
  with check (public.is_admin());

create policy "Admins update employees" on public.employees
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins delete employees" on public.employees
  for delete
  using (public.is_admin());

create policy "Employees view own profile" on public.employees
  for select
  using (
    auth.uid() is not null
    and auth.uid() = auth_user_id
    and is_active = true
  );

-- Replace jobs policies so employees can only see their assigned jobs.
drop policy if exists "Anyone can view jobs" on public.jobs;
drop policy if exists "Anyone can insert jobs" on public.jobs;
drop policy if exists "Anyone can update jobs" on public.jobs;
drop policy if exists "Anyone can delete jobs" on public.jobs;

drop policy if exists "Customers view own jobs" on public.jobs;
drop policy if exists "Admins view all jobs" on public.jobs;
drop policy if exists "Admins insert jobs" on public.jobs;
drop policy if exists "Admins update jobs" on public.jobs;
drop policy if exists "Admins delete jobs" on public.jobs;
drop policy if exists "Internal staff view all jobs" on public.jobs;
drop policy if exists "Internal staff insert jobs" on public.jobs;
drop policy if exists "Internal staff update jobs" on public.jobs;
drop policy if exists "Internal staff delete jobs" on public.jobs;
drop policy if exists "Employees view assigned jobs" on public.jobs;

create policy "Customers view own jobs" on public.jobs
  for select
  using (
    customer_id in (
      select id from public.customers where auth.uid() = user_id
    )
  );

create policy "Admins view all jobs" on public.jobs
  for select
  using (public.is_admin());

create policy "Admins insert jobs" on public.jobs
  for insert
  with check (public.is_admin());

create policy "Admins update jobs" on public.jobs
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins delete jobs" on public.jobs
  for delete
  using (public.is_admin());

create policy "Employees view assigned jobs" on public.jobs
  for select
  using (
    public.is_active_employee()
    and assigned_employee_id = public.current_employee_id()
  );
