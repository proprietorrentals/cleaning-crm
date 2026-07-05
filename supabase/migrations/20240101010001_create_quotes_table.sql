-- Create quotes table
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  square_footage numeric not null,
  cleaning_frequency text not null,
  extra_services text[] default '{}',
  notes text,
  total_estimate numeric not null,
  created_at timestamptz default now()
);

-- Create index for performance
create index if not exists quotes_customer_id_idx on public.quotes(customer_id);

-- Enable RLS
alter table public.quotes enable row level security;

-- Create policies
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
