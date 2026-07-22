-- Lead Marketplace Phase 4B
-- Adds metadata for AI-researched potential leads.

alter table public.potential_marketplace_leads
  add column if not exists research_sources jsonb not null default '[]'::jsonb,
  add column if not exists needs_manual_verification boolean not null default true;

create index if not exists potential_marketplace_leads_needs_manual_verification_idx
  on public.potential_marketplace_leads(needs_manual_verification, created_at desc);
