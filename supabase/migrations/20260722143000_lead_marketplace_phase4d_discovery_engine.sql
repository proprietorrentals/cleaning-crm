-- Lead Marketplace Phase 4D
-- AI lead discovery engine tables and discovery metadata.

create table if not exists public.lead_discovery_areas (
  area_id uuid primary key default gen_random_uuid(),
  city text not null,
  state text not null,
  zip_code text,
  radius_miles integer not null default 20,
  is_active boolean not null default true,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_discovery_areas_radius_check
    check (radius_miles >= 1 and radius_miles <= 100)
);

create table if not exists public.lead_discovery_runs (
  run_id uuid primary key default gen_random_uuid(),
  status text not null default 'running',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_seconds integer,
  requested_by_user_id uuid references auth.users(id) on delete set null,
  daily_limit integer not null default 100,
  selected_categories text[] not null default '{}'::text[],
  selected_area_ids uuid[] not null default '{}'::uuid[],
  businesses_found integer not null default 0,
  inserted_count integer not null default 0,
  duplicates_skipped integer not null default 0,
  failed_count integer not null default 0,
  average_confidence numeric(5,2) not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_discovery_runs_status_check
    check (status in ('running', 'paused', 'stopped', 'completed', 'failed')),
  constraint lead_discovery_runs_daily_limit_check
    check (daily_limit >= 1 and daily_limit <= 500)
);

create table if not exists public.lead_discovery_run_items (
  item_id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.lead_discovery_runs(run_id) on delete cascade,
  area_id uuid references public.lead_discovery_areas(area_id) on delete set null,
  city text not null,
  state text not null,
  zip_code text,
  category text not null,
  business_name text not null,
  website text,
  source_name text,
  source_url text,
  status text not null default 'queued',
  potential_lead_id uuid references public.potential_marketplace_leads(potential_lead_id) on delete set null,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_discovery_run_items_status_check
    check (status in ('queued', 'inserted', 'duplicate', 'failed'))
);

alter table public.potential_marketplace_leads
  add column if not exists discovered_via text not null default 'manual',
  add column if not exists discovery_run_id uuid references public.lead_discovery_runs(run_id) on delete set null,
  add column if not exists discovery_category text,
  add column if not exists discovered_at timestamptz;

alter table public.potential_marketplace_leads
  drop constraint if exists potential_marketplace_leads_discovered_via_check;
alter table public.potential_marketplace_leads
  add constraint potential_marketplace_leads_discovered_via_check
  check (discovered_via in ('manual', 'discovery'));

create index if not exists lead_discovery_areas_city_state_idx
  on public.lead_discovery_areas(state, city);

create index if not exists lead_discovery_runs_started_at_idx
  on public.lead_discovery_runs(started_at desc);

create index if not exists lead_discovery_runs_status_idx
  on public.lead_discovery_runs(status, started_at desc);

create index if not exists lead_discovery_run_items_run_idx
  on public.lead_discovery_run_items(run_id, created_at desc);

create index if not exists lead_discovery_run_items_status_idx
  on public.lead_discovery_run_items(status, created_at desc);

create index if not exists potential_marketplace_leads_discovered_idx
  on public.potential_marketplace_leads(discovered_via, discovered_at desc);

create or replace function public.touch_lead_discovery_areas_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_lead_discovery_areas_updated_at on public.lead_discovery_areas;
create trigger trg_touch_lead_discovery_areas_updated_at
before update on public.lead_discovery_areas
for each row execute function public.touch_lead_discovery_areas_updated_at();

create or replace function public.touch_lead_discovery_runs_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_lead_discovery_runs_updated_at on public.lead_discovery_runs;
create trigger trg_touch_lead_discovery_runs_updated_at
before update on public.lead_discovery_runs
for each row execute function public.touch_lead_discovery_runs_updated_at();

create or replace function public.touch_lead_discovery_run_items_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_lead_discovery_run_items_updated_at on public.lead_discovery_run_items;
create trigger trg_touch_lead_discovery_run_items_updated_at
before update on public.lead_discovery_run_items
for each row execute function public.touch_lead_discovery_run_items_updated_at();

alter table public.lead_discovery_areas enable row level security;
alter table public.lead_discovery_runs enable row level security;
alter table public.lead_discovery_run_items enable row level security;

drop policy if exists "Lead discovery areas super admins read" on public.lead_discovery_areas;
create policy "Lead discovery areas super admins read"
  on public.lead_discovery_areas
  for select
  using (public.is_super_admin());

drop policy if exists "Lead discovery areas super admins insert" on public.lead_discovery_areas;
create policy "Lead discovery areas super admins insert"
  on public.lead_discovery_areas
  for insert
  with check (public.is_super_admin());

drop policy if exists "Lead discovery areas super admins update" on public.lead_discovery_areas;
create policy "Lead discovery areas super admins update"
  on public.lead_discovery_areas
  for update
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Lead discovery areas super admins delete" on public.lead_discovery_areas;
create policy "Lead discovery areas super admins delete"
  on public.lead_discovery_areas
  for delete
  using (public.is_super_admin());

drop policy if exists "Lead discovery runs super admins read" on public.lead_discovery_runs;
create policy "Lead discovery runs super admins read"
  on public.lead_discovery_runs
  for select
  using (public.is_super_admin());

drop policy if exists "Lead discovery runs super admins insert" on public.lead_discovery_runs;
create policy "Lead discovery runs super admins insert"
  on public.lead_discovery_runs
  for insert
  with check (public.is_super_admin());

drop policy if exists "Lead discovery runs super admins update" on public.lead_discovery_runs;
create policy "Lead discovery runs super admins update"
  on public.lead_discovery_runs
  for update
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Lead discovery runs super admins delete" on public.lead_discovery_runs;
create policy "Lead discovery runs super admins delete"
  on public.lead_discovery_runs
  for delete
  using (public.is_super_admin());

drop policy if exists "Lead discovery items super admins read" on public.lead_discovery_run_items;
create policy "Lead discovery items super admins read"
  on public.lead_discovery_run_items
  for select
  using (public.is_super_admin());

drop policy if exists "Lead discovery items super admins insert" on public.lead_discovery_run_items;
create policy "Lead discovery items super admins insert"
  on public.lead_discovery_run_items
  for insert
  with check (public.is_super_admin());

drop policy if exists "Lead discovery items super admins update" on public.lead_discovery_run_items;
create policy "Lead discovery items super admins update"
  on public.lead_discovery_run_items
  for update
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Lead discovery items super admins delete" on public.lead_discovery_run_items;
create policy "Lead discovery items super admins delete"
  on public.lead_discovery_run_items
  for delete
  using (public.is_super_admin());

grant select, insert, update, delete on public.lead_discovery_areas to authenticated;
grant select, insert, update, delete on public.lead_discovery_runs to authenticated;
grant select, insert, update, delete on public.lead_discovery_run_items to authenticated;
