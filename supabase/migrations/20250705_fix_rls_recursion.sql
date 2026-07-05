-- Fix RLS infinite recursion by using a SECURITY DEFINER function for admin check
-- This function bypasses RLS so it doesn't cause recursion

-- Create function to check if user is an admin (no RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT auth.uid() IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.customers 
    WHERE user_id = auth.uid()
  );
$$;

-- Drop all existing policies that cause recursion
DROP POLICY IF EXISTS "Customers view own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins view all jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins delete jobs" ON public.jobs;

DROP POLICY IF EXISTS "Customers view own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins view all invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins delete invoices" ON public.invoices;

DROP POLICY IF EXISTS "Customers view own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins view all quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins manage quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins update quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins delete quotes" ON public.quotes;

DROP POLICY IF EXISTS "Customers view own company" ON public.customers;
DROP POLICY IF EXISTS "Admins view all customers" ON public.customers;
DROP POLICY IF EXISTS "Admins manage customers" ON public.customers;
DROP POLICY IF EXISTS "Admins update customers" ON public.customers;
DROP POLICY IF EXISTS "Admins delete customers" ON public.customers;

-- Create new policies for jobs table using the function
CREATE POLICY "Customers view own jobs" ON public.jobs
  FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE auth.uid() = user_id
    )
  );

CREATE POLICY "Admins view all jobs" ON public.jobs
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins insert jobs" ON public.jobs
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins update jobs" ON public.jobs
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins delete jobs" ON public.jobs
  FOR DELETE
  USING (public.is_admin());

-- Create new policies for invoices table using the function
CREATE POLICY "Customers view own invoices" ON public.invoices
  FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE auth.uid() = user_id
    )
  );

CREATE POLICY "Admins view all invoices" ON public.invoices
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins manage invoices" ON public.invoices
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins update invoices" ON public.invoices
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins delete invoices" ON public.invoices
  FOR DELETE
  USING (public.is_admin());

-- Create new policies for quotes table using the function
CREATE POLICY "Customers view own quotes" ON public.quotes
  FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE auth.uid() = user_id
    )
  );

CREATE POLICY "Admins view all quotes" ON public.quotes
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins manage quotes" ON public.quotes
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins update quotes" ON public.quotes
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins delete quotes" ON public.quotes
  FOR DELETE
  USING (public.is_admin());

-- Create new policies for customers table using the function
CREATE POLICY "Customers view own company" ON public.customers
  FOR SELECT
  USING (
    auth.uid() = user_id OR user_id IS NULL
  );

CREATE POLICY "Admins view all customers" ON public.customers
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins manage customers" ON public.customers
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins update customers" ON public.customers
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins delete customers" ON public.customers
  FOR DELETE
  USING (public.is_admin());
