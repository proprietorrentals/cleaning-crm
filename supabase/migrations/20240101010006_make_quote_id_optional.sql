-- Make quote_id optional in jobs table to allow manual job creation by admins
ALTER TABLE public.jobs ALTER COLUMN quote_id DROP NOT NULL;
