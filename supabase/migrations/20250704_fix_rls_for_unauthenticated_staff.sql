-- Fix RLS to allow unauthenticated staff access to jobs table

-- Drop all existing policies
DROP POLICY IF EXISTS "Customers view own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Internal staff can manage jobs" ON public.jobs;
DROP POLICY IF EXISTS "Internal staff view all jobs" ON public.jobs;
DROP POLICY IF EXISTS "Internal staff can insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "Internal staff can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Internal staff can delete jobs" ON public.jobs;

-- Policy 1: Customers can only view their own jobs (authenticated customers only)
CREATE POLICY "Customers view own jobs" ON public.jobs
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND customer_id IN (
      SELECT id FROM public.customers WHERE auth.uid() = user_id
    )
  );

-- Policy 2: Allow unauthenticated OR non-customer users (staff) to view all jobs
--          This is needed for admin pages that may not have a login
CREATE POLICY "Internal staff view all jobs" ON public.jobs
  FOR SELECT
  USING (
    auth.uid() IS NULL
    OR auth.uid() NOT IN (SELECT user_id FROM public.customers WHERE user_id IS NOT NULL)
  );

-- Policy 3: Allow staff to insert jobs (unauthenticated or non-customer users)
CREATE POLICY "Internal staff insert jobs" ON public.jobs
  FOR INSERT
  WITH CHECK (true);

-- Policy 4: Allow staff to update jobs
CREATE POLICY "Internal staff update jobs" ON public.jobs
  FOR UPDATE
  USING (
    auth.uid() IS NULL
    OR auth.uid() NOT IN (SELECT user_id FROM public.customers WHERE user_id IS NOT NULL)
  )
  WITH CHECK (true);

-- Policy 5: Allow staff to delete jobs
CREATE POLICY "Internal staff delete jobs" ON public.jobs
  FOR DELETE
  USING (
    auth.uid() IS NULL
    OR auth.uid() NOT IN (SELECT user_id FROM public.customers WHERE user_id IS NOT NULL)
  );
