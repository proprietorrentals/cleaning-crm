-- Lead Marketplace Phase 3A
-- Commercial Cleaning Opportunity Score for potential marketplace leads.

alter table public.potential_marketplace_leads
  add column if not exists opportunity_score integer,
  add column if not exists opportunity_grade text,
  add column if not exists score_breakdown jsonb,
  add column if not exists score_version text,
  add column if not exists scored_at timestamptz;

alter table public.potential_marketplace_leads
  drop constraint if exists potential_marketplace_leads_opportunity_score_check;
alter table public.potential_marketplace_leads
  add constraint potential_marketplace_leads_opportunity_score_check
  check (
    opportunity_score is null
    or (opportunity_score >= 0 and opportunity_score <= 100)
  );

alter table public.potential_marketplace_leads
  drop constraint if exists potential_marketplace_leads_opportunity_grade_check;
alter table public.potential_marketplace_leads
  add constraint potential_marketplace_leads_opportunity_grade_check
  check (
    opportunity_grade is null
    or opportunity_grade in ('A+', 'A', 'B', 'C', 'D')
  );

create index if not exists potential_marketplace_leads_opportunity_sort_idx
  on public.potential_marketplace_leads(
    opportunity_score desc,
    ai_confidence desc,
    created_at desc
  );

create index if not exists potential_marketplace_leads_opportunity_grade_idx
  on public.potential_marketplace_leads(opportunity_grade, opportunity_score desc);
