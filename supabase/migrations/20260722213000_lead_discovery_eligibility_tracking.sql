-- Lead Discovery eligibility tracking
-- Stores pre-research eligibility outcomes for discovery quality monitoring.

alter table public.lead_discovery_run_items
  add column if not exists lead_eligibility_score numeric(5,2),
  add column if not exists rejection_reason text;

alter table public.lead_discovery_run_items
  drop constraint if exists lead_discovery_run_items_lead_eligibility_score_check;
alter table public.lead_discovery_run_items
  add constraint lead_discovery_run_items_lead_eligibility_score_check
  check (
    lead_eligibility_score is null
    or (lead_eligibility_score >= 0 and lead_eligibility_score <= 100)
  );

create index if not exists lead_discovery_run_items_rejection_idx
  on public.lead_discovery_run_items(status, rejection_reason)
  where rejection_reason is not null;
