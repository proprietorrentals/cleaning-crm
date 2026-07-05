# Quotes Table Setup

Run this SQL in Supabase Dashboard → SQL Editor to create the `quotes` table:

```sql
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  square_footage numeric not null,
  cleaning_frequency text not null,
  extra_services text[] default '{}',
  notes text,
  total_estimate numeric not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create index for faster queries
create index if not exists quotes_customer_id_idx on public.quotes(customer_id);

-- Enable RLS (Row Level Security)
alter table public.quotes enable row level security;

-- Create policy to allow authenticated users to view their quotes
create policy "Users can view quotes" on public.quotes
  for select
  using (true);

-- Create policy to allow authenticated users to insert quotes
create policy "Users can create quotes" on public.quotes
  for insert
  with check (true);

-- Create policy to allow authenticated users to update their quotes
create policy "Users can update quotes" on public.quotes
  for update
  using (true)
  with check (true);

-- Create policy to allow authenticated users to delete their quotes
create policy "Users can delete quotes" on public.quotes
  for delete
  using (true);
```

## Important Notes

1. **Foreign Key**: The `quotes` table has a foreign key `customer_id` that references the `customers` table.
2. **Cascade Delete**: If a customer is deleted, all their quotes will be automatically deleted.
3. **RLS Policies**: The policies allow authenticated users to perform CRUD operations on quotes.
4. **Square Footage**: Stored as numeric for accurate calculations.
5. **Extra Services**: Stored as a text array (e.g., `['window_cleaning', 'carpet_shampoo']`).
