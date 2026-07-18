-- Lead Marketplace Phase 1A
-- Public commercial cleaning quote intake with super-admin visibility.

create table if not exists public.marketplace_leads (
  lead_id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text not null,
  email text not null,
  phone text not null,
  address text not null,
  city text not null,
  state text not null,
  zip_code text not null,
  property_type text not null,
  square_footage integer not null,
  cleaning_frequency text not null,
  service_requested text not null,
  budget text,
  preferred_start_date date,
  notes text,
  photo_urls text[] not null default '{}'::text[],
  ai_score integer not null default 0,
  estimated_contract_value numeric(12,2) not null default 0,
  close_probability numeric(5,2) not null default 0,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.marketplace_leads add column if not exists lead_id uuid default gen_random_uuid();
alter table public.marketplace_leads add column if not exists business_name text;
alter table public.marketplace_leads add column if not exists contact_name text;
alter table public.marketplace_leads add column if not exists email text;
alter table public.marketplace_leads add column if not exists phone text;
alter table public.marketplace_leads add column if not exists address text;
alter table public.marketplace_leads add column if not exists city text;
alter table public.marketplace_leads add column if not exists state text;
alter table public.marketplace_leads add column if not exists zip_code text;
alter table public.marketplace_leads add column if not exists property_type text;
alter table public.marketplace_leads add column if not exists square_footage integer;
alter table public.marketplace_leads add column if not exists cleaning_frequency text;
alter table public.marketplace_leads add column if not exists service_requested text;
alter table public.marketplace_leads add column if not exists budget text;
alter table public.marketplace_leads add column if not exists preferred_start_date date;
alter table public.marketplace_leads add column if not exists notes text;
alter table public.marketplace_leads add column if not exists photo_urls text[] default '{}'::text[];
alter table public.marketplace_leads add column if not exists ai_score integer default 0;
alter table public.marketplace_leads add column if not exists estimated_contract_value numeric(12,2) default 0;
alter table public.marketplace_leads add column if not exists close_probability numeric(5,2) default 0;
alter table public.marketplace_leads add column if not exists status text default 'new';
alter table public.marketplace_leads add column if not exists created_at timestamptz default now();
alter table public.marketplace_leads add column if not exists updated_at timestamptz default now();

alter table public.marketplace_leads alter column business_name set not null;
alter table public.marketplace_leads alter column contact_name set not null;
alter table public.marketplace_leads alter column email set not null;
alter table public.marketplace_leads alter column phone set not null;
alter table public.marketplace_leads alter column address set not null;
alter table public.marketplace_leads alter column city set not null;
alter table public.marketplace_leads alter column state set not null;
alter table public.marketplace_leads alter column zip_code set not null;
alter table public.marketplace_leads alter column property_type set not null;
alter table public.marketplace_leads alter column square_footage set not null;
alter table public.marketplace_leads alter column cleaning_frequency set not null;
alter table public.marketplace_leads alter column service_requested set not null;
alter table public.marketplace_leads alter column photo_urls set default '{}'::text[];
alter table public.marketplace_leads alter column photo_urls set not null;
alter table public.marketplace_leads alter column ai_score set default 0;
alter table public.marketplace_leads alter column ai_score set not null;
alter table public.marketplace_leads alter column estimated_contract_value set default 0;
alter table public.marketplace_leads alter column estimated_contract_value set not null;
alter table public.marketplace_leads alter column close_probability set default 0;
alter table public.marketplace_leads alter column close_probability set not null;
alter table public.marketplace_leads alter column status set default 'new';
alter table public.marketplace_leads alter column status set not null;
alter table public.marketplace_leads alter column created_at set default now();
alter table public.marketplace_leads alter column created_at set not null;
alter table public.marketplace_leads alter column updated_at set default now();
alter table public.marketplace_leads alter column updated_at set not null;

alter table public.marketplace_leads drop constraint if exists marketplace_leads_status_check;
alter table public.marketplace_leads
  add constraint marketplace_leads_status_check
  check (status in ('new', 'reviewing', 'qualified', 'contacted', 'closed_won', 'closed_lost'));

alter table public.marketplace_leads drop constraint if exists marketplace_leads_ai_score_check;
alter table public.marketplace_leads
  add constraint marketplace_leads_ai_score_check
  check (ai_score >= 0 and ai_score <= 100);

alter table public.marketplace_leads drop constraint if exists marketplace_leads_close_probability_check;
alter table public.marketplace_leads
  add constraint marketplace_leads_close_probability_check
  check (close_probability >= 0 and close_probability <= 1);

create index if not exists marketplace_leads_created_at_idx
  on public.marketplace_leads(created_at desc);

create index if not exists marketplace_leads_status_idx
  on public.marketplace_leads(status);

create index if not exists marketplace_leads_email_idx
  on public.marketplace_leads(email);

create or replace function public.touch_marketplace_leads_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_marketplace_leads_updated_at on public.marketplace_leads;
create trigger trg_touch_marketplace_leads_updated_at
before update on public.marketplace_leads
for each row execute function public.touch_marketplace_leads_updated_at();

alter table public.marketplace_leads enable row level security;

drop policy if exists "Marketplace leads public insert" on public.marketplace_leads;
create policy "Marketplace leads public insert" on public.marketplace_leads
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Marketplace leads super admins read" on public.marketplace_leads;
create policy "Marketplace leads super admins read" on public.marketplace_leads
  for select
  using (public.is_super_admin());

drop policy if exists "Marketplace leads super admins update" on public.marketplace_leads;
create policy "Marketplace leads super admins update" on public.marketplace_leads
  for update
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Marketplace leads super admins delete" on public.marketplace_leads;
create policy "Marketplace leads super admins delete" on public.marketplace_leads
  for delete
  using (public.is_super_admin());

insert into storage.buckets (id, name, public)
values ('marketplace-lead-photos', 'marketplace-lead-photos', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Marketplace lead photos public read" on storage.objects;
create policy "Marketplace lead photos public read"
  on storage.objects for select
  using (bucket_id = 'marketplace-lead-photos');
