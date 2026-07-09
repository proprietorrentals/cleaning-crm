-- Employee mileage tracking workflow.
-- Idempotent migration.

create table if not exists public.mileage_requests (
  id                   uuid primary key default gen_random_uuid(),
  from_job_id          uuid not null references public.jobs(id) on delete cascade,
  to_job_id            uuid not null references public.jobs(id) on delete cascade,
  employee_id          uuid not null references public.employees(id) on delete cascade,
  date                 date not null,
  miles                numeric(10,2) not null,
  notes                text,
  status               text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at          timestamptz,
  reviewed_by          uuid references auth.users(id) on delete set null,
  created_at           timestamptz not null default now()
);

create index if not exists mileage_requests_employee_id_idx on public.mileage_requests(employee_id);
create index if not exists mileage_requests_date_idx on public.mileage_requests(date);
create index if not exists mileage_requests_status_idx on public.mileage_requests(status);
create index if not exists mileage_requests_from_job_id_idx on public.mileage_requests(from_job_id);
create index if not exists mileage_requests_to_job_id_idx on public.mileage_requests(to_job_id);

create or replace function public.can_review_mileage()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tenant_admins where auth_user_id = auth.uid()
  )
  or exists (
    select 1 from public.super_admins where auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.employees
    where auth_user_id = auth.uid()
      and is_active = true
      and lower(role) in ('supervisor', 'manager')
  );
$$;

alter table public.mileage_requests enable row level security;

drop policy if exists "Employees view own mileage requests" on public.mileage_requests;
drop policy if exists "Employees insert own mileage requests" on public.mileage_requests;
drop policy if exists "Employees update own pending mileage requests" on public.mileage_requests;
drop policy if exists "Mileage reviewers manage all requests" on public.mileage_requests;

create policy "Employees view own mileage requests" on public.mileage_requests
  for select
  using (employee_id = public.current_employee_id());

create policy "Employees insert own mileage requests" on public.mileage_requests
  for insert
  with check (
    employee_id = public.current_employee_id()
    and status = 'pending'
  );

create policy "Employees update own pending mileage requests" on public.mileage_requests
  for update
  using (
    employee_id = public.current_employee_id()
    and status = 'pending'
  )
  with check (
    employee_id = public.current_employee_id()
    and status = 'pending'
  );

create policy "Mileage reviewers manage all requests" on public.mileage_requests
  for all
  using (public.can_review_mileage())
  with check (public.can_review_mileage());