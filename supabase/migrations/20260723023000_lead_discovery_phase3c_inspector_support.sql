-- Lead Discovery Phase 3C
-- Inspector support fields for candidate audit, replay, and safe overrides.

alter table public.lead_discovery_run_items
  add column if not exists search_query text,
  add column if not exists provider text,
  add column if not exists source_domain text,
  add column if not exists source_title text,
  add column if not exists source_snippet text,
  add column if not exists inspected_urls jsonb,
  add column if not exists pages_inspected jsonb,
  add column if not exists gate_stage text,
  add column if not exists gate_rule text,
  add column if not exists missing_evidence jsonb,
  add column if not exists conflicting_evidence jsonb,
  add column if not exists recommended_corrective_action text,
  add column if not exists provider_reasoning text,
  add column if not exists evidence_summary text,
  add column if not exists override_status boolean not null default false,
  add column if not exists override_reason text,
  add column if not exists overridden_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists overridden_at timestamptz,
  add column if not exists dismissed boolean not null default false,
  add column if not exists dismissed_reason text,
  add column if not exists dismissed_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists dismissed_at timestamptz,
  add column if not exists inspector_audit_log jsonb not null default '[]'::jsonb;

alter table public.lead_discovery_run_items
  drop constraint if exists lead_discovery_run_items_gate_stage_check;
alter table public.lead_discovery_run_items
  add constraint lead_discovery_run_items_gate_stage_check
  check (gate_stage is null or gate_stage in ('pre_enrichment', 'post_enrichment'));

create index if not exists lead_discovery_run_items_inspector_filters_idx
  on public.lead_discovery_run_items(
    run_id,
    provider,
    category,
    city,
    eligibility_status,
    rejection_reason,
    lead_eligibility_score desc,
    created_at desc
  );

create index if not exists lead_discovery_run_items_dismissed_idx
  on public.lead_discovery_run_items(dismissed, business_name, city, state)
  where dismissed = true;

create index if not exists lead_discovery_run_items_source_domain_idx
  on public.lead_discovery_run_items(source_domain, rejection_reason, created_at desc)
  where source_domain is not null;
