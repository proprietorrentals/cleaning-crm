-- Lead Marketplace Phase 4C
-- Adds smarter AI qualification fields for potential leads.

alter table public.potential_marketplace_leads
  add column if not exists estimated_building_size text,
  add column if not exists estimated_monthly_contract_value numeric(12,2),
  add column if not exists contract_value_confidence numeric(5,2) not null default 0,
  add column if not exists outsourcing_likelihood text not null default 'Unknown',
  add column if not exists organization_type text not null default 'unknown',
  add column if not exists opportunity_summary text,
  add column if not exists recommended_next_step text,
  add column if not exists procurement_notes text;

alter table public.potential_marketplace_leads
  drop constraint if exists potential_marketplace_leads_estimated_monthly_contract_value_check;
alter table public.potential_marketplace_leads
  add constraint potential_marketplace_leads_estimated_monthly_contract_value_check
  check (
    estimated_monthly_contract_value is null
    or estimated_monthly_contract_value >= 0
  );

alter table public.potential_marketplace_leads
  drop constraint if exists potential_marketplace_leads_contract_value_confidence_check;
alter table public.potential_marketplace_leads
  add constraint potential_marketplace_leads_contract_value_confidence_check
  check (
    contract_value_confidence >= 0
    and contract_value_confidence <= 100
  );

alter table public.potential_marketplace_leads
  drop constraint if exists potential_marketplace_leads_outsourcing_likelihood_check;
alter table public.potential_marketplace_leads
  add constraint potential_marketplace_leads_outsourcing_likelihood_check
  check (outsourcing_likelihood in ('High', 'Medium', 'Low', 'Unknown'));

alter table public.potential_marketplace_leads
  drop constraint if exists potential_marketplace_leads_organization_type_check;
alter table public.potential_marketplace_leads
  add constraint potential_marketplace_leads_organization_type_check
  check (
    organization_type in (
      'public sector',
      'education',
      'healthcare',
      'office',
      'industrial',
      'retail',
      'multifamily',
      'nonprofit',
      'unknown'
    )
  );

create index if not exists potential_marketplace_leads_organization_type_idx
  on public.potential_marketplace_leads(organization_type, created_at desc);

create index if not exists potential_marketplace_leads_outsourcing_likelihood_idx
  on public.potential_marketplace_leads(outsourcing_likelihood, created_at desc);
