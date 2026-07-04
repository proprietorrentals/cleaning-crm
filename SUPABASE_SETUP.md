# Supabase setup for Cleaning CRM

Create the following tables in Supabase SQL editor.

## customers
```sql
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
```

## quotes
```sql
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  contact_name text not null,
  email text not null,
  square_footage int8,
  cleaning_frequency text,
  extra_services text[],
  notes text,
  total_estimate numeric,
  created_at timestamptz default now()
);
```

## jobs
```sql
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid,
  client_name text not null,
  contact_name text not null,
  assigned_employee text,
  cleaning_date date,
  status text,
  notes text,
  created_at timestamptz default now()
);
```

## employees
```sql
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  role text not null,
  department text,
  hire_date date,
  status text,
  notes text,
  created_at timestamptz default now()
);
```

## invoices
```sql
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  invoice_number text not null,
  amount numeric not null,
  status text,
  due_date date,
  notes text,
  created_at timestamptz default now()
);
```

Enable Row Level Security if desired, then add policies for authenticated users.
