-- Create jobs table
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  scheduled_date date not null,
  assigned_employee text,
  status text not null default 'Scheduled',
  estimated_value numeric not null,
  notes text,
  created_at timestamptz default now()
);

-- Create indexes for performance
create index if not exists jobs_quote_id_idx on public.jobs(quote_id);
create index if not exists jobs_customer_id_idx on public.jobs(customer_id);
create index if not exists jobs_scheduled_date_idx on public.jobs(scheduled_date);
create index if not exists jobs_status_idx on public.jobs(status);

-- Enable RLS
alter table public.jobs enable row level security;

-- Create policies
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
