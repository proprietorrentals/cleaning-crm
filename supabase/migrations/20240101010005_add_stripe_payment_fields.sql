-- Add payment tracking fields to invoices table
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS stripe_payment_id text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_date timestamp;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_method text;

-- Create index for quick lookups by stripe_payment_id
CREATE INDEX IF NOT EXISTS invoices_stripe_payment_id_idx ON public.invoices(stripe_payment_id);

-- Add comment explaining the fields
COMMENT ON COLUMN public.invoices.stripe_payment_id IS 'Stripe payment ID for tracking';
COMMENT ON COLUMN public.invoices.payment_date IS 'Date when payment was received';
COMMENT ON COLUMN public.invoices.payment_method IS 'Payment method used (stripe_card, etc)';
