-- Lead Marketplace additive safety migration
-- Ensures claim workflow columns/indexes/constraints exist in environments that missed prior migration execution.

alter table public.marketplace_leads
  add column if not exists claimed_at timestamptz,
  add column if not exists claimed_by_user_id uuid,
  add column if not exists claimed_company_id uuid,
  add column if not exists claimed_by_user_email text,
  add column if not exists claimed_sales_lead_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'marketplace_leads_claimed_by_user_id_fkey'
  ) then
    alter table public.marketplace_leads
      add constraint marketplace_leads_claimed_by_user_id_fkey
      foreign key (claimed_by_user_id)
      references auth.users(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'marketplace_leads_claimed_company_id_fkey'
  ) then
    alter table public.marketplace_leads
      add constraint marketplace_leads_claimed_company_id_fkey
      foreign key (claimed_company_id)
      references public.customers(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'marketplace_leads_claimed_sales_lead_id_fkey'
  ) then
    alter table public.marketplace_leads
      add constraint marketplace_leads_claimed_sales_lead_id_fkey
      foreign key (claimed_sales_lead_id)
      references public.sales_leads(id)
      on delete set null;
  end if;
end $$;

alter table public.marketplace_leads
  alter column claimed_at drop not null,
  alter column claimed_by_user_id drop not null,
  alter column claimed_company_id drop not null,
  alter column claimed_by_user_email drop not null,
  alter column claimed_sales_lead_id drop not null;

create index if not exists marketplace_leads_claimed_at_idx
  on public.marketplace_leads(claimed_at desc);

create index if not exists marketplace_leads_claimed_by_user_id_idx
  on public.marketplace_leads(claimed_by_user_id);

create index if not exists marketplace_leads_claimed_company_id_idx
  on public.marketplace_leads(claimed_company_id);

alter table public.marketplace_leads
  drop constraint if exists marketplace_leads_status_check;
alter table public.marketplace_leads
  add constraint marketplace_leads_status_check
  check (status in ('new', 'reviewing', 'qualified', 'contacted', 'Claimed', 'closed_won', 'closed_lost'));
