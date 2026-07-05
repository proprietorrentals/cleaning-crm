# Invoices Table Setup

Run this SQL in Supabase Dashboard → SQL Editor to create the `invoices` table:

```sql
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

-- Enable RLS (Row Level Security)
alter table public.invoices enable row level security;

-- Create policies to allow authenticated users to perform CRUD operations
create policy "Users can view invoices" on public.invoices
  for select
  using (true);

create policy "Users can create invoices" on public.invoices
  for insert
  with check (true);

create policy "Users can update invoices" on public.invoices
  for update
  using (true)
  with check (true);

create policy "Users can delete invoices" on public.invoices
  for delete
  using (true);
```

## Important Notes

1. **Foreign Keys**: The `invoices` table has foreign keys to both `customers` and `jobs` tables.
2. **Unique Invoice Number**: Each invoice must have a unique `invoice_number` for identification.
3. **Cascade Delete**: If a job or customer is deleted, their associated invoices will be automatically deleted.
4. **Invoice Number Format**: Auto-generated as `INV-YYYYMMDD-XXXX` where XXXX is a random 4-digit number.
5. **Status Options**: Pending, Paid, Overdue (can be extended as needed)
6. **Due Date**: Defaults to 30 days from creation when generated from a job approval.
7. **RLS Policies**: Allow authenticated users to perform all CRUD operations on invoices.

## Field Descriptions

- **id**: Unique identifier (UUID)
- **invoice_number**: Unique invoice identifier (e.g., INV-20260704-0001)
- **customer_id**: Reference to the customer (for quick access without joining)
- **job_id**: Reference to the job this invoice is for
- **amount**: The invoice amount in dollars (numeric for precision)
- **due_date**: The date the invoice is due for payment
- **status**: Payment status (Pending, Paid, Overdue, etc.)
- **notes**: Any payment terms, special instructions, or notes
- **created_at**: Timestamp when the invoice was created

## Workflow

1. Jobs are created from approved quotes
2. When a job is marked as "Completed", it becomes available for invoicing
3. Users select a completed job to create an invoice from
4. Invoice number is auto-generated with today's date
5. Customer and job information are pre-filled
6. Amount defaults to the job's estimated value
7. Due date defaults to 30 days from now
8. Invoice is saved to Supabase with status "Pending"
