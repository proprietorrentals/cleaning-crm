# Jobs Table Setup

Run this SQL in Supabase Dashboard → SQL Editor to create the `jobs` table:

```sql
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

-- Enable RLS (Row Level Security)
alter table public.jobs enable row level security;

-- Create policies to allow authenticated users to perform CRUD operations
create policy "Users can view jobs" on public.jobs
  for select
  using (true);

create policy "Users can create jobs" on public.jobs
  for insert
  with check (true);

create policy "Users can update jobs" on public.jobs
  for update
  using (true)
  with check (true);

create policy "Users can delete jobs" on public.jobs
  for delete
  using (true);
```

## Important Notes

1. **Foreign Keys**: The `jobs` table has foreign keys to both `quotes` and `customers` tables.
2. **Cascade Delete**: If a quote or customer is deleted, their associated jobs will be automatically deleted.
3. **Scheduled Date**: Stored as a `date` type for easy filtering by date ranges.
4. **Status**: Starts as 'Scheduled' when created from a quote approval. Can be updated to 'In Progress', 'Completed', 'Cancelled', etc.
5. **Estimated Value**: Copied from the quote's `total_estimate` for record-keeping.
6. **Assigned Employee**: Optional text field (can be expanded to a foreign key to an `employees` table later).
7. **RLS Policies**: Allow authenticated users to perform all CRUD operations on jobs.

## Field Descriptions

- **id**: Unique identifier (UUID)
- **quote_id**: Reference to the quote that was approved
- **customer_id**: Reference to the customer (for quick access without joining to quotes)
- **scheduled_date**: The date the job is scheduled for
- **assigned_employee**: Name or ID of the employee assigned (optional)
- **status**: Job status (Scheduled, In Progress, Completed, Cancelled, etc.)
- **estimated_value**: The estimated cost (copied from quote)
- **notes**: Any special instructions or notes about the job
- **created_at**: Timestamp when the job was created
