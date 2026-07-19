-- Lead Marketplace Phase 1B
-- Adds deterministic qualification, duplicate/spam tracking, and super-admin audit history.
-- Additive migration only. Preserves existing Phase 1A table, RLS, and storage behavior.

alter table public.marketplace_leads
  add column if not exists qualification_status text default 'New',
  add column if not exists quality_score integer default 0,
  add column if not exists lead_grade text default 'D',
  add column if not exists estimated_monthly_value numeric(12,2) default 0,
  add column if not exists estimated_annual_value numeric(12,2) default 0,
  add column if not exists urgency_score integer default 0,
  add column if not exists completeness_score integer default 0,
  add column if not exists duplicate_risk numeric(5,2) default 0,
  add column if not exists spam_risk numeric(5,2) default 0,
  add column if not exists qualification_summary text,
  add column if not exists scoring_breakdown jsonb default '{}'::jsonb,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references auth.users(id) on delete set null,
  add column if not exists internal_notes text,
  add column if not exists qualification_last_run_at timestamptz;

update public.marketplace_leads
set
  qualification_status = coalesce(nullif(qualification_status, ''), 'New'),
  quality_score = coalesce(quality_score, ai_score, 0),
  lead_grade = coalesce(nullif(lead_grade, ''),
    case
      when coalesce(quality_score, ai_score, 0) >= 92 then 'A+'
      when coalesce(quality_score, ai_score, 0) >= 82 then 'A'
      when coalesce(quality_score, ai_score, 0) >= 68 then 'B'
      when coalesce(quality_score, ai_score, 0) >= 52 then 'C'
      else 'D'
    end),
  estimated_monthly_value = coalesce(estimated_monthly_value, 0),
  estimated_annual_value = coalesce(estimated_annual_value, estimated_contract_value, 0),
  urgency_score = coalesce(urgency_score, greatest(20, least(95, coalesce(quality_score, ai_score, 0)))),
  completeness_score = coalesce(completeness_score, 70),
  duplicate_risk = coalesce(duplicate_risk, 0),
  spam_risk = coalesce(spam_risk, 0),
  scoring_breakdown = coalesce(scoring_breakdown, '{}'::jsonb),
  qualification_last_run_at = coalesce(qualification_last_run_at, created_at);

alter table public.marketplace_leads
  alter column qualification_status set default 'New',
  alter column qualification_status set not null,
  alter column quality_score set default 0,
  alter column quality_score set not null,
  alter column lead_grade set default 'D',
  alter column lead_grade set not null,
  alter column estimated_monthly_value set default 0,
  alter column estimated_monthly_value set not null,
  alter column estimated_annual_value set default 0,
  alter column estimated_annual_value set not null,
  alter column urgency_score set default 0,
  alter column urgency_score set not null,
  alter column completeness_score set default 0,
  alter column completeness_score set not null,
  alter column duplicate_risk set default 0,
  alter column duplicate_risk set not null,
  alter column spam_risk set default 0,
  alter column spam_risk set not null,
  alter column scoring_breakdown set default '{}'::jsonb,
  alter column scoring_breakdown set not null;

alter table public.marketplace_leads
  drop constraint if exists marketplace_leads_qualification_status_check;
alter table public.marketplace_leads
  add constraint marketplace_leads_qualification_status_check
  check (qualification_status in ('New', 'Needs Review', 'Verified', 'Rejected'));

alter table public.marketplace_leads
  drop constraint if exists marketplace_leads_quality_score_check;
alter table public.marketplace_leads
  add constraint marketplace_leads_quality_score_check
  check (quality_score >= 0 and quality_score <= 100);

alter table public.marketplace_leads
  drop constraint if exists marketplace_leads_urgency_score_check;
alter table public.marketplace_leads
  add constraint marketplace_leads_urgency_score_check
  check (urgency_score >= 0 and urgency_score <= 100);

alter table public.marketplace_leads
  drop constraint if exists marketplace_leads_completeness_score_check;
alter table public.marketplace_leads
  add constraint marketplace_leads_completeness_score_check
  check (completeness_score >= 0 and completeness_score <= 100);

alter table public.marketplace_leads
  drop constraint if exists marketplace_leads_lead_grade_check;
alter table public.marketplace_leads
  add constraint marketplace_leads_lead_grade_check
  check (lead_grade in ('A+', 'A', 'B', 'C', 'D'));

alter table public.marketplace_leads
  drop constraint if exists marketplace_leads_duplicate_risk_check;
alter table public.marketplace_leads
  add constraint marketplace_leads_duplicate_risk_check
  check (duplicate_risk >= 0 and duplicate_risk <= 1);

alter table public.marketplace_leads
  drop constraint if exists marketplace_leads_spam_risk_check;
alter table public.marketplace_leads
  add constraint marketplace_leads_spam_risk_check
  check (spam_risk >= 0 and spam_risk <= 1);

create index if not exists marketplace_leads_qualification_status_idx
  on public.marketplace_leads(qualification_status);

create index if not exists marketplace_leads_quality_score_idx
  on public.marketplace_leads(quality_score desc);

create index if not exists marketplace_leads_grade_idx
  on public.marketplace_leads(lead_grade);

create index if not exists marketplace_leads_city_idx
  on public.marketplace_leads(city);

create index if not exists marketplace_leads_zip_idx
  on public.marketplace_leads(zip_code);

create index if not exists marketplace_leads_property_type_idx
  on public.marketplace_leads(property_type);

create index if not exists marketplace_leads_verified_at_idx
  on public.marketplace_leads(verified_at desc);

create table if not exists public.marketplace_lead_audit_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.marketplace_leads(lead_id) on delete cascade,
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users(id) on delete set null,
  action text not null,
  change_summary text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists marketplace_lead_audit_history_lead_idx
  on public.marketplace_lead_audit_history(lead_id, changed_at desc);

create index if not exists marketplace_lead_audit_history_changed_by_idx
  on public.marketplace_lead_audit_history(changed_by, changed_at desc);

alter table public.marketplace_lead_audit_history enable row level security;

drop policy if exists "Marketplace lead audit super admins read" on public.marketplace_lead_audit_history;
create policy "Marketplace lead audit super admins read"
  on public.marketplace_lead_audit_history
  for select
  using (public.is_super_admin());

drop policy if exists "Marketplace lead audit super admins insert" on public.marketplace_lead_audit_history;
create policy "Marketplace lead audit super admins insert"
  on public.marketplace_lead_audit_history
  for insert
  with check (public.is_super_admin());

grant select, insert on public.marketplace_lead_audit_history to authenticated;
