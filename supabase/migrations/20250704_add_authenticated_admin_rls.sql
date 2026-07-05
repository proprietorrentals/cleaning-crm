-- Fix RLS policies to support authenticated admin access
-- Admins are authenticated users who are NOT linked to any customer account

-- Drop all existing policies on jobs table
DROP POLICY IF EXISTS "Customers view own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Internal staff can manage jobs" ON public.jobs;
DROP POLICY IF EXISTS "Internal staff view all jobs" ON public.jobs;
DROP POLICY IF EXISTS "Internal staff can insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "Internal staff can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Internal staff can delete jobs" ON public.jobs;

-- Create new comprehensive policies for jobs table

-- 1. Customers (authenticated users linked to a customer) can view their own jobs
CREATE POLICY "Customers view own jobs" ON public.jobs
  FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE auth.uid() = user_id
    )
  );

-- 2. Admins (authenticated users NOT linked to any customer) can view all jobs
CREATE POLICY "Admins view all jobs" ON public.jobs
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND auth.uid() NOT IN (SELECT user_id FROM public.customers WHERE user_id IS NOT NULL)
  );

-- 3. Admins can insert jobs
CREATE POLICY "Admins insert jobs" ON public.jobs
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() NOT IN (SELECT user_id FROM public.customers WHERE user_id IS NOT NULL)
  );

-- 4. Admins can update jobs
CREATE POLICY "Admins update jobs" ON public.jobs
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND auth.uid() NOT IN (SELECT user_id FROM public.customers WHERE user_id IS NOT NULL)
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() NOT IN (SELECT user_id FROM public.customers WHERE user_id IS NOT NULL)
  );

-- 5. Admins can delete jobs
CREATE POLICY "Admins delete jobs" ON public.jobs
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND auth.uid() NOT IN (SELECT user_id FROM public.customers WHERE user_id IS NOT NULL)
  );

-- Similar policies for invoices table
DROP POLICY IF EXISTS "Customers view own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Customers update own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Internal staff manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins view all invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins manage invoices" ON public.invoices;

-- 1. Customers can view their own invoices
CREATE POLICY "Customers view own invoices" ON public.invoices
  FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE auth.uid() = user_id
    )
  );

-- 2. Admins can view all invoices
CREATE POLICY "Admins view all invoices" ON public.invoices
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND auth.uid() NOT IN (SELECT user_id FROM public.customers WHERE user_id IS NOT NULL)
  );

-- 3. Admins can insert/update/delete invoices
CREATE POLICY "Admins manage invoices" ON public.invoices
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() NOT IN (SELECT user_id FROM public.customers WHERE user_id IS NOT NULL)
  );

CREATE POLICY "Admins update invoices" ON public.invoices
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND auth.uid() NOT IN (SELECT user_id FROM public.customers WHERE user_id IS NOT NULL)
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() NOT IN (SELECT user_id FROM public.customers WHERE user_id IS NOT NULL)
  );

CREATE POLICY "Admins delete invoices" ON public.invoices
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND auth.uid() NOT IN (SELECT user_id FROM public.customers WHERE user_id IS NOT NULL)
  );

-- Similar for quotes
DROP POLICY IF EXISTS "Customers view own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Customers approve own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Internal staff can insert quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins view all quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins manage quotes" ON public.quotes;

CREATE POLICY "Customers view own quotes" ON public.quotes
  FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE auth.uid() = user_id
    )
  );

CREATE POLICY "Admins view all quotes" ON public.quotes
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND auth.uid() NOT IN (SELECT user_id FROM public.customers WHERE user_id IS NOT NULL)
  );

CREATE POLICY "Admins manage quotes" ON public.quotes
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() NOT IN (SELECT user_id FROM public.customers WHERE user_id IS NOT NULL)
  );

CREATE POLICY "Admins update quotes" ON public.quotes
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND auth.uid() NOT IN (SELECT user_id FROM public.customers WHERE user_id IS NOT NULL)
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() NOT IN (SELECT user_id FROM public.customers WHERE user_id IS NOT NULL)
  );

CREATE POLICY "Admins delete quotes" ON public.quotes
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND auth.uid() NOT IN (SELECT user_id FROM public.customers WHERE user_id IS NOT NULL)
  );

-- Similar for customers
DROP POLICY IF EXISTS "Customers view own company" ON public.customers;
DROP POLICY IF EXISTS "Customers update own company" ON public.customers;
DROP POLICY IF EXISTS "Internal staff can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Prevent customer deletion" ON public.customers;
DROP POLICY IF EXISTS "Admins view all customers" ON public.customers;
DROP POLICY IF EXISTS "Admins manage customers" ON public.customers;

CREATE POLICY "Customers view own company" ON public.customers
  FOR SELECT
  USING (
    auth.uid() = user_id OR user_id IS NULL
  );

CREATE POLICY "Admins view all customers" ON public.customers
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND auth.uid() NOT IN (SELECT user_id FROM public.customers WHERE user_id IS NOT NULL)
  );

CREATE POLICY "Admins manage customers" ON public.customers
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() NOT IN (SELECT user_id FROM public.customers WHERE user_id IS NOT NULL)
  );

CREATE POLICY "Admins update customers" ON public.customers
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND auth.uid() NOT IN (SELECT user_id FROM public.customers WHERE user_id IS NOT NULL)
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() NOT IN (SELECT user_id FROM public.customers WHERE user_id IS NOT NULL)
  );

CREATE POLICY "Admins delete customers" ON public.customers
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND auth.uid() NOT IN (SELECT user_id FROM public.customers WHERE user_id IS NOT NULL)
  );
