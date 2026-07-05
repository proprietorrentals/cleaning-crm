-- Add user_id column to customers table for linking to Supabase auth
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS user_id uuid references auth.users(id) on delete cascade;

-- Create index on user_id for performance
CREATE INDEX IF NOT EXISTS customers_user_id_idx ON public.customers(user_id);

-- Enable RLS on customers table (if not already enabled)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and create new ones with user isolation
DROP POLICY IF EXISTS "Anyone can view customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can update customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can delete customers" ON public.customers;

-- RLS Policy: Customers can only view their own record
CREATE POLICY "Customers view own company" ON public.customers
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- RLS Policy: Customers can update their own record
CREATE POLICY "Customers update own company" ON public.customers
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Admin can insert (no check - for internal use)
CREATE POLICY "Internal staff can insert customers" ON public.customers
  FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Customers cannot delete
CREATE POLICY "Prevent customer deletion" ON public.customers
  FOR DELETE
  USING (false);

-- Update RLS on quotes table to link through customers
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view quotes" ON public.quotes;
DROP POLICY IF EXISTS "Anyone can insert quotes" ON public.quotes;
DROP POLICY IF EXISTS "Anyone can update quotes" ON public.quotes;
DROP POLICY IF EXISTS "Anyone can delete quotes" ON public.quotes;

-- RLS Policy: Customers can view their own quotes
CREATE POLICY "Customers view own quotes" ON public.quotes
  FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE auth.uid() = user_id
    )
    OR customer_id IN (
      SELECT id FROM public.customers WHERE user_id IS NULL
    )
  );

-- RLS Policy: Customers can update their own quotes (approve)
CREATE POLICY "Customers approve own quotes" ON public.quotes
  FOR UPDATE
  USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE auth.uid() = user_id
    )
  );

-- RLS Policy: Internal staff can insert quotes
CREATE POLICY "Internal staff can insert quotes" ON public.quotes
  FOR INSERT
  WITH CHECK (true);

-- Update RLS on jobs table
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view jobs" ON public.jobs;
DROP POLICY IF EXISTS "Anyone can insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "Anyone can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Anyone can delete jobs" ON public.jobs;

-- RLS Policy: Customers can view their own jobs
CREATE POLICY "Customers view own jobs" ON public.jobs
  FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE auth.uid() = user_id
    )
  );

-- RLS Policy: Internal staff can manage jobs
CREATE POLICY "Internal staff can manage jobs" ON public.jobs
  FOR INSERT
  WITH CHECK (true);

-- Update RLS on invoices table
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Anyone can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Anyone can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Anyone can delete invoices" ON public.invoices;

-- RLS Policy: Customers can view their own invoices
CREATE POLICY "Customers view own invoices" ON public.invoices
  FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE auth.uid() = user_id
    )
  );

-- RLS Policy: Internal staff can create invoices
CREATE POLICY "Internal staff can insert invoices" ON public.invoices
  FOR INSERT
  WITH CHECK (true);
