-- Create customers table
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

-- Create index on email for faster lookups
create index if not exists customers_email_idx on public.customers(email);

-- Enable RLS
alter table public.customers enable row level security;

-- Create policies
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
