-- Multi-portal SaaS enhancements.
-- Adds: super_admins, tenants, time_entries, job_photos, service_requests, settings
-- Extends: jobs table with started_at, completed_at, signature_url
-- Idempotent: all statements use IF NOT EXISTS / OR REPLACE / ON CONFLICT.

-- ─── SUPER ADMINS ────────────────────────────────────────────────────────────

create table if not exists public.super_admins (
  id           uuid        primary key default gen_random_uuid(),
  auth_user_id uuid        unique not null references auth.users(id) on delete cascade,
  email        text        not null,
  created_at   timestamptz default now()
);

create index if not exists super_admins_auth_user_id_idx on public.super_admins(auth_user_id);

-- ─── TENANTS (companies using the SaaS platform) ─────────────────────────────

create table if not exists public.tenants (
  id                      uuid        primary key default gen_random_uuid(),
  company_name            text        not null,
  owner_email             text        not null,
  plan                    text        not null default 'starter'
                          check (plan in ('starter', 'professional', 'enterprise')),
  status                  text        not null default 'active'
                          check (status in ('active', 'suspended', 'cancelled')),
  stripe_customer_id      text,
  stripe_subscription_id  text,
  created_at              timestamptz default now()
);

-- ─── TIME ENTRIES (employee clock-in / clock-out) ────────────────────────────

create table if not exists public.time_entries (
  id          uuid        primary key default gen_random_uuid(),
  employee_id uuid        not null references public.employees(id) on delete cascade,
  job_id      uuid        references public.jobs(id) on delete set null,
  clock_in    timestamptz not null default now(),
  clock_out   timestamptz,
  notes       text,
  created_at  timestamptz default now()
);

create index if not exists time_entries_employee_id_idx on public.time_entries(employee_id);
create index if not exists time_entries_job_id_idx      on public.time_entries(job_id);

-- ─── JOB PHOTOS (before / after / signature) ─────────────────────────────────

create table if not exists public.job_photos (
  id          uuid        primary key default gen_random_uuid(),
  job_id      uuid        not null references public.jobs(id) on delete cascade,
  employee_id uuid        not null references public.employees(id) on delete cascade,
  photo_url   text        not null,
  photo_type  text        not null check (photo_type in ('before', 'after', 'signature')),
  notes       text,
  created_at  timestamptz default now()
);

create index if not exists job_photos_job_id_idx on public.job_photos(job_id);

-- ─── SERVICE REQUESTS (customers request new service) ────────────────────────

create table if not exists public.service_requests (
  id             uuid        primary key default gen_random_uuid(),
  customer_id    uuid        not null references public.customers(id) on delete cascade,
  service_type   text        not null,
  preferred_date date,
  notes          text,
  status         text        not null default 'pending'
                 check (status in ('pending', 'reviewed', 'converted', 'declined')),
  created_at     timestamptz default now()
);

create index if not exists service_requests_customer_id_idx on public.service_requests(customer_id);

-- ─── COMPANY SETTINGS (singleton row, id always 1) ───────────────────────────

create table if not exists public.settings (
  id                integer     primary key default 1 check (id = 1),
  company_name      text        default 'ServiceFlow CRM',
  company_address   text,
  company_phone     text,
  company_email     text,
  company_logo_url  text,
  updated_at        timestamptz default now()
);

-- Seed default row.
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ─── JOBS: NEW COLUMNS ───────────────────────────────────────────────────────

alter table public.jobs add column if not exists started_at    timestamptz;
alter table public.jobs add column if not exists completed_at  timestamptz;
alter table public.jobs add column if not exists signature_url text;

-- ─── SUPABASE STORAGE BUCKET ─────────────────────────────────────────────────
-- Creates the job-photos bucket if it doesn't exist.
-- The bucket is public so photo URLs can be embedded without auth tokens.

insert into storage.buckets (id, name, public)
values ('job-photos', 'job-photos', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload to the job-photos bucket.
drop policy if exists "Authenticated users upload job photos" on storage.objects;
create policy "Authenticated users upload job photos"
  on storage.objects for insert
  with check (
    bucket_id = 'job-photos'
    and auth.role() = 'authenticated'
  );

-- Allow authenticated users to replace (update) their uploads.
drop policy if exists "Authenticated users update job photos" on storage.objects;
create policy "Authenticated users update job photos"
  on storage.objects for update
  using (
    bucket_id = 'job-photos'
    and auth.role() = 'authenticated'
  );

-- Public read access for the bucket.
drop policy if exists "Public read job photos" on storage.objects;
create policy "Public read job photos"
  on storage.objects for select
  using (bucket_id = 'job-photos');

-- ─── HELPER: is_super_admin() ────────────────────────────────────────────────

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.super_admins where auth_user_id = auth.uid()
  );
$$;

-- ─── RLS: SUPER ADMINS ───────────────────────────────────────────────────────

alter table public.super_admins enable row level security;

drop policy if exists "Super admins view own row" on public.super_admins;
create policy "Super admins view own row" on public.super_admins
  for select
  using (auth.uid() = auth_user_id);

-- ─── RLS: TENANTS ────────────────────────────────────────────────────────────

alter table public.tenants enable row level security;

drop policy if exists "Super admins manage tenants" on public.tenants;
create policy "Super admins manage tenants" on public.tenants
  for all
  using  (public.is_super_admin())
  with check (public.is_super_admin());

-- ─── RLS: TIME ENTRIES ───────────────────────────────────────────────────────

alter table public.time_entries enable row level security;

drop policy if exists "Admins view all time entries"        on public.time_entries;
drop policy if exists "Admins manage time entries"          on public.time_entries;
drop policy if exists "Employees view own time entries"     on public.time_entries;
drop policy if exists "Employees insert own time entries"   on public.time_entries;
drop policy if exists "Employees update own time entries"   on public.time_entries;

create policy "Admins view all time entries" on public.time_entries
  for select
  using (public.is_admin());

create policy "Admins manage time entries" on public.time_entries
  for all
  using  (public.is_admin())
  with check (public.is_admin());

create policy "Employees view own time entries" on public.time_entries
  for select
  using (
    public.is_active_employee()
    and employee_id = public.current_employee_id()
  );

create policy "Employees insert own time entries" on public.time_entries
  for insert
  with check (
    public.is_active_employee()
    and employee_id = public.current_employee_id()
  );

create policy "Employees update own time entries" on public.time_entries
  for update
  using (
    public.is_active_employee()
    and employee_id = public.current_employee_id()
  )
  with check (
    public.is_active_employee()
    and employee_id = public.current_employee_id()
  );

-- ─── RLS: JOB PHOTOS ─────────────────────────────────────────────────────────

alter table public.job_photos enable row level security;

drop policy if exists "Admins manage job photos"          on public.job_photos;
drop policy if exists "Employees view job photos"         on public.job_photos;
drop policy if exists "Employees insert own job photos"   on public.job_photos;

create policy "Admins manage job photos" on public.job_photos
  for all
  using  (public.is_admin())
  with check (public.is_admin());

create policy "Employees view job photos" on public.job_photos
  for select
  using (public.is_active_employee());

create policy "Employees insert own job photos" on public.job_photos
  for insert
  with check (
    public.is_active_employee()
    and employee_id = public.current_employee_id()
  );

-- ─── RLS: SERVICE REQUESTS ───────────────────────────────────────────────────

alter table public.service_requests enable row level security;

drop policy if exists "Admins manage service requests"          on public.service_requests;
drop policy if exists "Customers view own service requests"     on public.service_requests;
drop policy if exists "Customers insert service requests"       on public.service_requests;

create policy "Admins manage service requests" on public.service_requests
  for all
  using  (public.is_admin())
  with check (public.is_admin());

create policy "Customers view own service requests" on public.service_requests
  for select
  using (
    customer_id in (
      select id from public.customers where user_id = auth.uid()
    )
  );

create policy "Customers insert service requests" on public.service_requests
  for insert
  with check (
    customer_id in (
      select id from public.customers where user_id = auth.uid()
    )
  );

-- ─── RLS: SETTINGS ───────────────────────────────────────────────────────────

alter table public.settings enable row level security;

drop policy if exists "Admins manage settings"      on public.settings;
drop policy if exists "Authenticated read settings" on public.settings;

create policy "Admins manage settings" on public.settings
  for all
  using  (public.is_admin())
  with check (public.is_admin());

create policy "Authenticated read settings" on public.settings
  for select
  using (auth.uid() is not null);
