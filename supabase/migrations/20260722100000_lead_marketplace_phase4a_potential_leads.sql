-- Lead Marketplace Phase 4A
-- Potential lead research workspace for Super Admin review before marketplace verification.

create table if not exists public.potential_marketplace_leads (
  potential_lead_id uuid primary key default gen_random_uuid(),
  business_name text not null,
  website text,
  phone text,
  email text,
  address text not null,
  city text not null,
  state text not null,
  zip_code text,
  property_type text not null,
  estimated_contract_value numeric(12,2) not null default 0,
  ai_confidence numeric(5,2) not null default 0,
  ai_reasoning text,
  research_notes text,
  status text not null default 'New',
  verified_marketplace_lead_id uuid references public.marketplace_leads(lead_id) on delete set null,
  reviewed_by_user_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  verified_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint potential_marketplace_leads_status_check
    check (status in ('New', 'AI Reviewed', 'Needs Review', 'Verified', 'Rejected')),
  constraint potential_marketplace_leads_estimated_contract_value_check
    check (estimated_contract_value >= 0),
  constraint potential_marketplace_leads_ai_confidence_check
    check (ai_confidence >= 0 and ai_confidence <= 100)
);

create index if not exists potential_marketplace_leads_status_idx
  on public.potential_marketplace_leads(status, created_at desc);

create index if not exists potential_marketplace_leads_location_idx
  on public.potential_marketplace_leads(state, city);

create index if not exists potential_marketplace_leads_verified_marketplace_lead_idx
  on public.potential_marketplace_leads(verified_marketplace_lead_id)
  where verified_marketplace_lead_id is not null;

create or replace function public.touch_potential_marketplace_leads_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_potential_marketplace_leads_updated_at on public.potential_marketplace_leads;
create trigger trg_touch_potential_marketplace_leads_updated_at
before update on public.potential_marketplace_leads
for each row execute function public.touch_potential_marketplace_leads_updated_at();

alter table public.potential_marketplace_leads enable row level security;

drop policy if exists "Potential marketplace leads super admins read" on public.potential_marketplace_leads;
create policy "Potential marketplace leads super admins read"
  on public.potential_marketplace_leads
  for select
  using (public.is_super_admin());

drop policy if exists "Potential marketplace leads super admins insert" on public.potential_marketplace_leads;
create policy "Potential marketplace leads super admins insert"
  on public.potential_marketplace_leads
  for insert
  with check (public.is_super_admin());

drop policy if exists "Potential marketplace leads super admins update" on public.potential_marketplace_leads;
create policy "Potential marketplace leads super admins update"
  on public.potential_marketplace_leads
  for update
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Potential marketplace leads super admins delete" on public.potential_marketplace_leads;
create policy "Potential marketplace leads super admins delete"
  on public.potential_marketplace_leads
  for delete
  using (public.is_super_admin());

grant select, insert, update, delete on public.potential_marketplace_leads to authenticated;
