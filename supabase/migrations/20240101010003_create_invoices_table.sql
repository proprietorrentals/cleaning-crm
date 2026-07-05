-- Create invoices table
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

-- Create indexes for performance
create index if not exists invoices_customer_id_idx on public.invoices(customer_id);
create index if not exists invoices_job_id_idx on public.invoices(job_id);
create index if not exists invoices_invoice_number_idx on public.invoices(invoice_number);
create index if not exists invoices_status_idx on public.invoices(status);
create index if not exists invoices_due_date_idx on public.invoices(due_date);

-- Enable RLS
alter table public.invoices enable row level security;

-- Create policies
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
