# Supabase Migrations

This folder contains SQL migrations for the Cleaning CRM database. Migrations are numbered sequentially and should be applied in order.

## Migration Files

### 1. `20240101010000_create_customers_table.sql`
Creates the `customers` table with the following columns:
- `id` (UUID, primary key)
- `company_name` (text, required)
- `contact_name` (text, required)
- `phone` (text)
- `email` (text, required)
- `address` (text)
- `building_size` (text)
- `cleaning_frequency` (text)
- `notes` (text)
- `created_at` (timestamp)

**No dependencies** — Can be applied first.

### 2. `20240101010001_create_quotes_table.sql`
Creates the `quotes` table with the following columns:
- `id` (UUID, primary key)
- `customer_id` (UUID, foreign key → customers)
- `square_footage` (numeric, required)
- `cleaning_frequency` (text, required)
- `extra_services` (text array)
- `notes` (text)
- `total_estimate` (numeric, required)
- `created_at` (timestamp)

**Dependencies:** `customers` table must exist.

### 3. `20240101010002_create_jobs_table.sql`
Creates the `jobs` table with the following columns:
- `id` (UUID, primary key)
- `quote_id` (UUID, foreign key → quotes)
- `customer_id` (UUID, foreign key → customers)
- `scheduled_date` (date, required)
- `assigned_employee` (text)
- `status` (text, default: 'Scheduled')
- `estimated_value` (numeric, required)
- `notes` (text)
- `created_at` (timestamp)

**Dependencies:** `customers` and `quotes` tables must exist.

### 4. `20240101010003_create_invoices_table.sql`
Creates the `invoices` table with the following columns:
- `id` (UUID, primary key)
- `invoice_number` (text, unique, required)
- `customer_id` (UUID, foreign key → customers)
- `job_id` (UUID, foreign key → jobs)
- `amount` (numeric, required)
- `due_date` (date, required)
- `status` (text, default: 'Pending')
- `notes` (text)
- `created_at` (timestamp)

**Dependencies:** `customers` and `jobs` tables must exist.

## Features

All migrations include:
- **Cascade Delete**: Foreign key constraints with `ON DELETE CASCADE` to maintain referential integrity
- **Indexes**: Performance indexes on foreign keys and commonly queried columns
- **Row Level Security (RLS)**: Enabled for all tables with permissive policies
- **Policies**: CRUD policies allowing authenticated users full access to their data

## Applying Migrations

To apply migrations to your Supabase database:

1. Open **Supabase Dashboard → SQL Editor**
2. Copy the contents of each migration file in numerical order
3. Execute each one sequentially
4. Verify tables are created in the **Table Editor**

## Reverting Migrations

To drop all tables (in reverse order of creation):

```sql
-- Drop invoices (depends on jobs)
drop table if not exists public.invoices cascade;

-- Drop jobs (depends on quotes)
drop table if not exists public.jobs cascade;

-- Drop quotes (depends on customers)
drop table if not exists public.quotes cascade;

-- Drop customers
drop table if not exists public.customers cascade;
```

## Database Schema Diagram

```
customers
    ↓
    ├── quotes (customer_id FK)
    │     ↓
    │     └── jobs (quote_id FK + customer_id FK)
    │           ↓
    │           └── invoices (customer_id FK + job_id FK)
    │
    └── jobs (customer_id FK)
          ↓
          └── invoices (customer_id FK + job_id FK)
```

## Notes

- All UUIDs are generated using `gen_random_uuid()`
- All timestamps use `now()` function
- Foreign key constraints use `ON DELETE CASCADE` for data integrity
- Indexes are created for optimal query performance
- All tables have Row Level Security enabled with permissive policies
