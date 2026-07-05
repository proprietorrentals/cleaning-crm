-- ================================================================
-- SUPABASE DATABASE SETUP - RUN THIS IN SUPABASE SQL EDITOR
-- ================================================================
-- This file contains all migrations needed to set up the Cleaning CRM database.
-- Copy and paste this entire content into your Supabase project's SQL Editor
-- and click "Run" to create all tables and policies.
-- ================================================================

-- 1. CREATE CUSTOMERS TABLE (no dependencies)
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  phone text,
  email text not null,
  address text,
  building_size text,
  cleaning_frequency text,
  notes text,
  created_at timestamptz default now()
);

create index if not exists customers_email_idx on public.customers(email);
create index if not exists customers_created_at_idx on public.customers(created_at);

alter table public.customers enable row level security;

create policy "Anyone can view customers" on public.customers
  for select
  using (true);

create policy "Anyone can insert customers" on public.customers
  for insert
  with check (true);

create policy "Anyone can update customers" on public.customers
  for update
  using (true)
  with check (true);

create policy "Anyone can delete customers" on public.customers
  for delete
  using (true);

-- 2. CREATE QUOTES TABLE (depends on customers)
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  square_footage numeric not null,
  cleaning_frequency text not null,
  extra_services text[] default array[]::text[],
  notes text,
  total_estimate numeric not null,
  created_at timestamptz default now()
);

create index if not exists quotes_customer_id_idx on public.quotes(customer_id);
create index if not exists quotes_created_at_idx on public.quotes(created_at);

alter table public.quotes enable row level security;

create policy "Anyone can view quotes" on public.quotes
  for select
  using (true);

create policy "Anyone can insert quotes" on public.quotes
  for insert
  with check (true);

create policy "Anyone can update quotes" on public.quotes
  for update
  using (true)
  with check (true);

create policy "Anyone can delete quotes" on public.quotes
  for delete
  using (true);

-- 3. CREATE JOBS TABLE (depends on customers and quotes)
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references public.quotes(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  scheduled_date date not null,
  assigned_employee text,
  status text not null default 'Scheduled',
  estimated_value numeric not null,
  notes text,
  created_at timestamptz default now()
);

create index if not exists jobs_quote_id_idx on public.jobs(quote_id);
create index if not exists jobs_customer_id_idx on public.jobs(customer_id);
create index if not exists jobs_scheduled_date_idx on public.jobs(scheduled_date);
create index if not exists jobs_status_idx on public.jobs(status);

alter table public.jobs enable row level security;

create policy "Anyone can view jobs" on public.jobs
  for select
  using (true);

create policy "Anyone can insert jobs" on public.jobs
  for insert
  with check (true);

create policy "Anyone can update jobs" on public.jobs
  for update
  using (true)
  with check (true);

create policy "Anyone can delete jobs" on public.jobs
  for delete
  using (true);

-- 4. CREATE INVOICES TABLE (depends on customers and jobs)
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  customer_id uuid not null references public.customers(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  amount numeric not null,
  due_date date not null,
  status text not null default 'Pending',
  notes text,
  created_at timestamptz default now()
);

create index if not exists invoices_customer_id_idx on public.invoices(customer_id);
create index if not exists invoices_job_id_idx on public.invoices(job_id);
create index if not exists invoices_invoice_number_idx on public.invoices(invoice_number);
create index if not exists invoices_status_idx on public.invoices(status);
create index if not exists invoices_due_date_idx on public.invoices(due_date);

alter table public.invoices enable row level security;

create policy "Anyone can view invoices" on public.invoices
  for select
  using (true);

create policy "Anyone can insert invoices" on public.invoices
  for insert
  with check (true);

create policy "Anyone can update invoices" on public.invoices
  for update
  using (true)
  with check (true);

create policy "Anyone can delete invoices" on public.invoices
  for delete
  using (true);

-- ================================================================
-- SETUP COMPLETE
-- ================================================================
-- You now have 4 tables: customers, quotes, jobs, invoices
-- All tables have RLS enabled with permissive policies for internal use
-- All foreign key relationships are configured with CASCADE delete
-- Performance indexes are created on common query fields
-- ================================================================
