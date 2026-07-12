-- Add route-calculation metadata fields for mileage requests.
-- Idempotent migration.

alter table public.mileage_requests
  add column if not exists calculated_miles numeric(10,2),
  add column if not exists submitted_miles numeric(10,2),
  add column if not exists estimated_duration_minutes integer,
  add column if not exists origin_address text,
  add column if not exists destination_address text,
  add column if not exists distance_provider text,
  add column if not exists manual_adjustment_reason text;

-- Backfill submitted_miles for existing rows so legacy records remain comparable.
update public.mileage_requests
set submitted_miles = miles
where submitted_miles is null;
