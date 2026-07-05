-- Fix: Add SELECT policy for internal staff on jobs table
-- The issue: Admin users could not view jobs because RLS only had a customer SELECT policy
-- This prevented the invoices page from fetching completed jobs for invoice creation

-- First, check current state and drop if exists
DROP POLICY IF EXISTS "Customers view own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Internal staff can manage jobs" ON public.jobs;
DROP POLICY IF EXISTS "Internal staff can view all jobs" ON public.jobs;

-- Create two separate policies:
-- 1. Customers can only view their own jobs
CREATE POLICY "Customers view own jobs" ON public.jobs
  FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE auth.uid() = user_id
    )
  );

-- 2. Internal staff (users without a customer record) can view all jobs
--    This allows admin/staff to see all jobs for invoice creation
CREATE POLICY "Internal staff view all jobs" ON public.jobs
  FOR SELECT
  USING (
    -- Allow if current user is NOT linked to any customer
    auth.uid() NOT IN (SELECT user_id FROM public.customers WHERE user_id IS NOT NULL)
  );

-- Keep the existing insert policy for staff
CREATE POLICY "Internal staff can insert jobs" ON public.jobs
  FOR INSERT
  WITH CHECK (true);

-- Also allow staff to update jobs
CREATE POLICY "Internal staff can update jobs" ON public.jobs
  FOR UPDATE
  USING (
    -- Allow if current user is NOT linked to any customer (is staff)
    auth.uid() NOT IN (SELECT user_id FROM public.customers WHERE user_id IS NOT NULL)
  )
  WITH CHECK (true);

-- Also allow staff to delete jobs
CREATE POLICY "Internal staff can delete jobs" ON public.jobs
  FOR DELETE
  USING (
    -- Allow if current user is NOT linked to any customer (is staff)
    auth.uid() NOT IN (SELECT user_id FROM public.customers WHERE user_id IS NOT NULL)
  );
