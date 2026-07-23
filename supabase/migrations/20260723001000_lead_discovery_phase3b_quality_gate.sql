-- Lead Discovery Phase 3B
-- Adds quality-gate tracking fields for pre-enrichment eligibility decisions.

alter table public.lead_discovery_run_items
  add column if not exists eligibility_status text,
  add column if not exists location_match boolean,
  add column if not exists facility_confirmed boolean,
  add column if not exists official_source_confirmed boolean,
  add column if not exists category_match boolean;

update public.lead_discovery_run_items
set rejection_reason = 'weak_source_evidence'
where rejection_reason is not null
  and rejection_reason not in (
    'wrong_market',
    'no_physical_location',
    'missing_business_name',
    'social_profile_only',
    'directory_listing_only',
    'product_or_software_page',
    'property_listing_without_owner',
    'category_mismatch',
    'duplicate',
    'weak_source_evidence'
  );

alter table public.lead_discovery_run_items
  drop constraint if exists lead_discovery_run_items_eligibility_status_check;
alter table public.lead_discovery_run_items
  add constraint lead_discovery_run_items_eligibility_status_check
  check (
    eligibility_status is null
    or eligibility_status in ('Eligible', 'Needs Research', 'Rejected')
  );

alter table public.lead_discovery_run_items
  drop constraint if exists lead_discovery_run_items_rejection_reason_check;
alter table public.lead_discovery_run_items
  add constraint lead_discovery_run_items_rejection_reason_check
  check (
    rejection_reason is null
    or rejection_reason in (
      'wrong_market',
      'no_physical_location',
      'missing_business_name',
      'social_profile_only',
      'directory_listing_only',
      'product_or_software_page',
      'property_listing_without_owner',
      'category_mismatch',
      'duplicate',
      'weak_source_evidence'
    )
  );

create index if not exists lead_discovery_run_items_eligibility_idx
  on public.lead_discovery_run_items(run_id, eligibility_status, category, created_at desc);

create index if not exists lead_discovery_run_items_quality_flags_idx
  on public.lead_discovery_run_items(
    run_id,
    location_match,
    facility_confirmed,
    official_source_confirmed,
    category_match
  );
