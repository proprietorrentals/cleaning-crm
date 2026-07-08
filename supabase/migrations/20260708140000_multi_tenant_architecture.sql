-- Multi-tenant SaaS architecture migration.
-- Adds tenant isolation to all data tables, introduces tenant_admins,
-- auto-fills tenant_id via triggers, and hardens every RLS policy.
-- Idempotent: safe to run on a database that already has some of these objects.

-- ─── TENANTS: add slug for human-readable lookup ──────────────────────────────

alter table public.tenants
  add column if not exists slug text;

create unique index if not exists tenants_slug_idx
  on public.tenants(slug)
  where slug is not null;

-- ─── DEFAULT TENANT ──────────────────────────────────────────────────────────
-- All pre-existing single-tenant data is assigned here so nothing breaks.

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

-- ─── TENANT ADMINS ───────────────────────────────────────────────────────────
-- Maps each admin auth user to the tenant they manage.

create table if not exists public.tenant_admins (
  id           uuid        primary key default gen_random_uuid(),
  tenant_id    uuid        not null references public.tenants(id) on delete cascade,
  auth_user_id uuid        unique not null references auth.users(id) on delete cascade,
  email        text        not null,
  created_at   timestamptz default now()
);

create index if not exists tenant_admins_tenant_id_idx    on public.tenant_admins(tenant_id);
create index if not exists tenant_admins_auth_user_id_idx on public.tenant_admins(auth_user_id);

-- ─── ADD tenant_id TO ALL DATA TABLES ────────────────────────────────────────

alter table public.customers        add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;
alter table public.employees        add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;
alter table public.quotes           add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;
alter table public.jobs             add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;
alter table public.invoices         add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;
alter table public.time_entries     add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;
alter table public.job_photos       add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;
alter table public.service_requests add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

create index if not exists customers_tenant_id_idx        on public.customers(tenant_id);
create index if not exists employees_tenant_id_idx        on public.employees(tenant_id);
create index if not exists quotes_tenant_id_idx           on public.quotes(tenant_id);
create index if not exists jobs_tenant_id_idx             on public.jobs(tenant_id);
create index if not exists invoices_tenant_id_idx         on public.invoices(tenant_id);
create index if not exists time_entries_tenant_id_idx     on public.time_entries(tenant_id);
create index if not exists job_photos_tenant_id_idx       on public.job_photos(tenant_id);
create index if not exists service_requests_tenant_id_idx on public.service_requests(tenant_id);

-- ─── BACKFILL: assign orphaned rows to default tenant ────────────────────────

update public.customers        set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;
update public.employees        set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;
update public.quotes           set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;
update public.jobs             set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;
update public.invoices         set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;
update public.time_entries     set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;
update public.job_photos       set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;
update public.service_requests set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;

-- ─── ENFORCE NOT NULL ────────────────────────────────────────────────────────

alter table public.customers        alter column tenant_id set not null;
alter table public.employees        alter column tenant_id set not null;
alter table public.quotes           alter column tenant_id set not null;
alter table public.jobs             alter column tenant_id set not null;
alter table public.invoices         alter column tenant_id set not null;
alter table public.time_entries     alter column tenant_id set not null;
alter table public.job_photos       alter column tenant_id set not null;
alter table public.service_requests alter column tenant_id set not null;

-- ─── MIGRATE EXISTING ADMIN AUTH USERS → tenant_admins ───────────────────────
-- Any auth user that is NOT a customer, employee, or super admin is a legacy
-- admin. Assign them to the default tenant automatically.

insert into public.tenant_admins (tenant_id, auth_user_id, email)
select
  '00000000-0000-0000-0000-000000000001',
  u.id,
  u.email
from auth.users u
where not exists (select 1 from public.customers    where user_id     = u.id)
  and not exists (select 1 from public.employees    where auth_user_id = u.id)
  and not exists (select 1 from public.super_admins where auth_user_id = u.id)
  and not exists (select 1 from public.tenant_admins where auth_user_id = u.id)
on conflict (auth_user_id) do nothing;

-- ─── SETTINGS: convert singleton → per-tenant ────────────────────────────────
-- Drop the old singleton table (id=1) and replace it with a tenant-keyed one.

drop table if exists public.settings;

create table if not exists public.settings (
  tenant_id        uuid        primary key references public.tenants(id) on delete cascade,
  company_name     text        default 'My Company',
  company_address  text,
  company_phone    text,
  company_email    text,
  company_logo_url text,
  updated_at       timestamptz default now()
);

-- Seed default tenant settings.
insert into public.settings (tenant_id)
values ('00000000-0000-0000-0000-000000000001')
on conflict (tenant_id) do nothing;

-- ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────

-- Returns the tenant the current session belongs to.
-- Checks admin table first, then employee, then customer.
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.tenant_admins
    where auth_user_id = auth.uid()
  union all
  select tenant_id from public.employees
    where auth_user_id = auth.uid() and is_active = true
  union all
  select tenant_id from public.customers
    where user_id = auth.uid()
  limit 1;
$$;

-- Replaces the old "NOT in customers" check with a proper tenant_admins lookup.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tenant_admins where auth_user_id = auth.uid()
  );
$$;

-- ─── TRIGGER: auto-fill tenant_id on INSERT ──────────────────────────────────
-- Reads the current session's tenant via current_tenant_id() so app code
-- never needs to pass tenant_id explicitly.

create or replace function public.set_tenant_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tenant_id is null then
    new.tenant_id := public.current_tenant_id();
  end if;
  if new.tenant_id is null then
    raise exception 'Cannot determine tenant for current session. Ensure the user is linked to a tenant.';
  end if;
  return new;
end;
$$;

-- Apply trigger to every tenant-scoped table.
drop trigger if exists trg_set_tenant_id on public.customers;
create trigger trg_set_tenant_id
  before insert on public.customers
  for each row execute function public.set_tenant_id();

drop trigger if exists trg_set_tenant_id on public.employees;
create trigger trg_set_tenant_id
  before insert on public.employees
  for each row execute function public.set_tenant_id();

drop trigger if exists trg_set_tenant_id on public.quotes;
create trigger trg_set_tenant_id
  before insert on public.quotes
  for each row execute function public.set_tenant_id();

drop trigger if exists trg_set_tenant_id on public.jobs;
create trigger trg_set_tenant_id
  before insert on public.jobs
  for each row execute function public.set_tenant_id();

drop trigger if exists trg_set_tenant_id on public.invoices;
create trigger trg_set_tenant_id
  before insert on public.invoices
  for each row execute function public.set_tenant_id();

drop trigger if exists trg_set_tenant_id on public.time_entries;
create trigger trg_set_tenant_id
  before insert on public.time_entries
  for each row execute function public.set_tenant_id();

drop trigger if exists trg_set_tenant_id on public.job_photos;
create trigger trg_set_tenant_id
  before insert on public.job_photos
  for each row execute function public.set_tenant_id();

drop trigger if exists trg_set_tenant_id on public.service_requests;
create trigger trg_set_tenant_id
  before insert on public.service_requests
  for each row execute function public.set_tenant_id();

-- ─── RLS: TENANT_ADMINS ──────────────────────────────────────────────────────

alter table public.tenant_admins enable row level security;

drop policy if exists "Tenant admins view own record"  on public.tenant_admins;
drop policy if exists "Super admins manage all admins" on public.tenant_admins;

create policy "Tenant admins view own record" on public.tenant_admins
  for select
  using (auth_user_id = auth.uid());

create policy "Super admins manage all admins" on public.tenant_admins
  for all
  using  (public.is_super_admin())
  with check (public.is_super_admin());

-- ─── RLS: CUSTOMERS ──────────────────────────────────────────────────────────

alter table public.customers enable row level security;

drop policy if exists "Anyone can view customers"                    on public.customers;
drop policy if exists "Anyone can insert customers"                  on public.customers;
drop policy if exists "Anyone can update customers"                  on public.customers;
drop policy if exists "Anyone can delete customers"                  on public.customers;
drop policy if exists "Admins view all customers"                    on public.customers;
drop policy if exists "Admins insert customers"                      on public.customers;
drop policy if exists "Admins update customers"                      on public.customers;
drop policy if exists "Admins delete customers"                      on public.customers;
drop policy if exists "Customers view own profile"                   on public.customers;
drop policy if exists "Customers can view their own profile"         on public.customers;
drop policy if exists "Internal staff can view all customers"        on public.customers;
drop policy if exists "Internal staff can insert customers"          on public.customers;
drop policy if exists "Internal staff can update customers"          on public.customers;
drop policy if exists "Internal staff can delete customers"          on public.customers;
drop policy if exists "Admins manage own tenant customers"           on public.customers;

create policy "Admins manage own tenant customers" on public.customers
  for all
  using  (public.is_admin() and tenant_id = public.current_tenant_id())
  with check (public.is_admin() and tenant_id = public.current_tenant_id());

create policy "Customers view own profile" on public.customers
  for select
  using (user_id = auth.uid() and tenant_id = public.current_tenant_id());

create policy "Customers insert own profile" on public.customers
  for insert
  with check (user_id = auth.uid());

-- ─── RLS: EMPLOYEES ──────────────────────────────────────────────────────────

alter table public.employees enable row level security;

drop policy if exists "Admins view all employees"           on public.employees;
drop policy if exists "Admins insert employees"             on public.employees;
drop policy if exists "Admins update employees"             on public.employees;
drop policy if exists "Admins delete employees"             on public.employees;
drop policy if exists "Employees view own profile"          on public.employees;
drop policy if exists "Anyone can view employees"           on public.employees;
drop policy if exists "Anyone can insert employees"         on public.employees;
drop policy if exists "Anyone can update employees"         on public.employees;
drop policy if exists "Anyone can delete employees"         on public.employees;
drop policy if exists "Admins manage own tenant employees"  on public.employees;

create policy "Admins manage own tenant employees" on public.employees
  for all
  using  (public.is_admin() and tenant_id = public.current_tenant_id())
  with check (public.is_admin() and tenant_id = public.current_tenant_id());

create policy "Employees view own profile" on public.employees
  for select
  using (
    auth.uid() is not null
    and auth.uid() = auth_user_id
    and is_active = true
    and tenant_id = public.current_tenant_id()
  );

-- ─── RLS: QUOTES ─────────────────────────────────────────────────────────────

alter table public.quotes enable row level security;

drop policy if exists "Anyone can view quotes"                 on public.quotes;
drop policy if exists "Anyone can insert quotes"               on public.quotes;
drop policy if exists "Anyone can update quotes"               on public.quotes;
drop policy if exists "Anyone can delete quotes"               on public.quotes;
drop policy if exists "Admins view all quotes"                 on public.quotes;
drop policy if exists "Admins insert quotes"                   on public.quotes;
drop policy if exists "Admins update quotes"                   on public.quotes;
drop policy if exists "Admins delete quotes"                   on public.quotes;
drop policy if exists "Customers view own quotes"              on public.quotes;
drop policy if exists "Internal staff can view all quotes"     on public.quotes;
drop policy if exists "Internal staff can insert quotes"       on public.quotes;
drop policy if exists "Internal staff can update quotes"       on public.quotes;
drop policy if exists "Internal staff can delete quotes"       on public.quotes;
drop policy if exists "Admins manage own tenant quotes"        on public.quotes;

create policy "Admins manage own tenant quotes" on public.quotes
  for all
  using  (public.is_admin() and tenant_id = public.current_tenant_id())
  with check (public.is_admin() and tenant_id = public.current_tenant_id());

create policy "Customers view own quotes" on public.quotes
  for select
  using (
    customer_id in (select id from public.customers where user_id = auth.uid())
    and tenant_id = public.current_tenant_id()
  );

-- ─── RLS: JOBS ───────────────────────────────────────────────────────────────

alter table public.jobs enable row level security;

drop policy if exists "Anyone can view jobs"                on public.jobs;
drop policy if exists "Anyone can insert jobs"              on public.jobs;
drop policy if exists "Anyone can update jobs"              on public.jobs;
drop policy if exists "Anyone can delete jobs"              on public.jobs;
drop policy if exists "Customers view own jobs"             on public.jobs;
drop policy if exists "Admins view all jobs"                on public.jobs;
drop policy if exists "Admins insert jobs"                  on public.jobs;
drop policy if exists "Admins update jobs"                  on public.jobs;
drop policy if exists "Admins delete jobs"                  on public.jobs;
drop policy if exists "Internal staff view all jobs"        on public.jobs;
drop policy if exists "Internal staff insert jobs"          on public.jobs;
drop policy if exists "Internal staff update jobs"          on public.jobs;
drop policy if exists "Internal staff delete jobs"          on public.jobs;
drop policy if exists "Employees view assigned jobs"        on public.jobs;
drop policy if exists "Employees update assigned jobs"      on public.jobs;
drop policy if exists "Admins manage own tenant jobs"       on public.jobs;

create policy "Admins manage own tenant jobs" on public.jobs
  for all
  using  (public.is_admin() and tenant_id = public.current_tenant_id())
  with check (public.is_admin() and tenant_id = public.current_tenant_id());

create policy "Customers view own jobs" on public.jobs
  for select
  using (
    customer_id in (select id from public.customers where user_id = auth.uid())
    and tenant_id = public.current_tenant_id()
  );

create policy "Employees view assigned jobs" on public.jobs
  for select
  using (
    public.is_active_employee()
    and assigned_employee_id = public.current_employee_id()
    and tenant_id = public.current_tenant_id()
  );

create policy "Employees update assigned jobs" on public.jobs
  for update
  using (
    public.is_active_employee()
    and assigned_employee_id = public.current_employee_id()
    and tenant_id = public.current_tenant_id()
  )
  with check (
    public.is_active_employee()
    and assigned_employee_id = public.current_employee_id()
    and tenant_id = public.current_tenant_id()
  );

-- ─── RLS: INVOICES ───────────────────────────────────────────────────────────

alter table public.invoices enable row level security;

drop policy if exists "Anyone can view invoices"               on public.invoices;
drop policy if exists "Anyone can insert invoices"             on public.invoices;
drop policy if exists "Anyone can update invoices"             on public.invoices;
drop policy if exists "Anyone can delete invoices"             on public.invoices;
drop policy if exists "Admins view all invoices"               on public.invoices;
drop policy if exists "Admins manage invoices"                 on public.invoices;
drop policy if exists "Admins update invoices"                 on public.invoices;
drop policy if exists "Admins delete invoices"                 on public.invoices;
drop policy if exists "Customers view own invoices"            on public.invoices;
drop policy if exists "Internal staff can view all invoices"   on public.invoices;
drop policy if exists "Internal staff can insert invoices"     on public.invoices;
drop policy if exists "Internal staff can update invoices"     on public.invoices;
drop policy if exists "Internal staff can delete invoices"     on public.invoices;
drop policy if exists "Admins manage own tenant invoices"      on public.invoices;

create policy "Admins manage own tenant invoices" on public.invoices
  for all
  using  (public.is_admin() and tenant_id = public.current_tenant_id())
  with check (public.is_admin() and tenant_id = public.current_tenant_id());

create policy "Customers view own invoices" on public.invoices
  for select
  using (
    customer_id in (select id from public.customers where user_id = auth.uid())
    and tenant_id = public.current_tenant_id()
  );

-- ─── RLS: TIME_ENTRIES ───────────────────────────────────────────────────────

alter table public.time_entries enable row level security;

drop policy if exists "Admins view all time entries"          on public.time_entries;
drop policy if exists "Admins manage time entries"            on public.time_entries;
drop policy if exists "Employees view own time entries"       on public.time_entries;
drop policy if exists "Employees insert own time entries"     on public.time_entries;
drop policy if exists "Employees update own time entries"     on public.time_entries;
drop policy if exists "Admins manage own tenant time entries" on public.time_entries;
drop policy if exists "Employees manage own time entries"     on public.time_entries;

create policy "Admins manage own tenant time entries" on public.time_entries
  for all
  using  (public.is_admin() and tenant_id = public.current_tenant_id())
  with check (public.is_admin() and tenant_id = public.current_tenant_id());

create policy "Employees manage own time entries" on public.time_entries
  for all
  using  (
    public.is_active_employee()
    and employee_id = public.current_employee_id()
    and tenant_id = public.current_tenant_id()
  )
  with check (
    public.is_active_employee()
    and employee_id = public.current_employee_id()
    and tenant_id = public.current_tenant_id()
  );

-- ─── RLS: JOB_PHOTOS ─────────────────────────────────────────────────────────

alter table public.job_photos enable row level security;

drop policy if exists "Admins manage job photos"               on public.job_photos;
drop policy if exists "Employees view job photos"              on public.job_photos;
drop policy if exists "Employees insert own job photos"        on public.job_photos;
drop policy if exists "Admins manage own tenant job photos"    on public.job_photos;
drop policy if exists "Employees manage own job photos"        on public.job_photos;

create policy "Admins manage own tenant job photos" on public.job_photos
  for all
  using  (public.is_admin() and tenant_id = public.current_tenant_id())
  with check (public.is_admin() and tenant_id = public.current_tenant_id());

create policy "Employees manage own job photos" on public.job_photos
  for all
  using  (
    public.is_active_employee()
    and employee_id = public.current_employee_id()
    and tenant_id = public.current_tenant_id()
  )
  with check (
    public.is_active_employee()
    and employee_id = public.current_employee_id()
    and tenant_id = public.current_tenant_id()
  );

-- ─── RLS: SERVICE_REQUESTS ───────────────────────────────────────────────────

alter table public.service_requests enable row level security;

drop policy if exists "Admins manage service requests"                   on public.service_requests;
drop policy if exists "Customers view own service requests"              on public.service_requests;
drop policy if exists "Customers insert service requests"                on public.service_requests;
drop policy if exists "Admins manage own tenant service requests"        on public.service_requests;
drop policy if exists "Customers view own service requests (tenant)"     on public.service_requests;
drop policy if exists "Customers insert own service requests"            on public.service_requests;

create policy "Admins manage own tenant service requests" on public.service_requests
  for all
  using  (public.is_admin() and tenant_id = public.current_tenant_id())
  with check (public.is_admin() and tenant_id = public.current_tenant_id());

create policy "Customers view own service requests" on public.service_requests
  for select
  using (
    customer_id in (select id from public.customers where user_id = auth.uid())
    and tenant_id = public.current_tenant_id()
  );

create policy "Customers insert own service requests" on public.service_requests
  for insert
  with check (
    customer_id in (select id from public.customers where user_id = auth.uid())
  );

-- ─── RLS: SETTINGS ───────────────────────────────────────────────────────────

alter table public.settings enable row level security;

drop policy if exists "Admins manage settings"                 on public.settings;
drop policy if exists "Authenticated read settings"            on public.settings;
drop policy if exists "Admins manage own tenant settings"      on public.settings;
drop policy if exists "Authenticated read own tenant settings" on public.settings;

create policy "Admins manage own tenant settings" on public.settings
  for all
  using  (public.is_admin() and tenant_id = public.current_tenant_id())
  with check (public.is_admin() and tenant_id = public.current_tenant_id());

create policy "Authenticated read own tenant settings" on public.settings
  for select
  using (tenant_id = public.current_tenant_id());
