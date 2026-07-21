-- Lead Marketplace Phase 4B
-- Saved searches and smart alerts for tenant-scoped company users.

create table if not exists public.marketplace_saved_searches (
  saved_search_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  state text,
  city text,
  radius_miles integer not null default 25,
  property_type text,
  lead_grade text,
  minimum_contract_value numeric(12,2) not null default 0,
  verified_only boolean not null default false,
  notification_email boolean not null default true,
  notification_in_app boolean not null default true,
  notification_sms boolean not null default false,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_by_user_email text,
  last_matched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_saved_searches_radius_check
    check (radius_miles >= 0 and radius_miles <= 500),
  constraint marketplace_saved_searches_lead_grade_check
    check (lead_grade is null or lead_grade in ('A+', 'A', 'B', 'C', 'D', 'F'))
);

create index if not exists marketplace_saved_searches_tenant_idx
  on public.marketplace_saved_searches(tenant_id, created_at desc);

create index if not exists marketplace_saved_searches_name_idx
  on public.marketplace_saved_searches(tenant_id, name);

create index if not exists marketplace_saved_searches_alert_idx
  on public.marketplace_saved_searches(tenant_id, verified_only, lead_grade, radius_miles);

create or replace function public.touch_marketplace_saved_searches_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_marketplace_saved_searches_updated_at on public.marketplace_saved_searches;
create trigger trg_touch_marketplace_saved_searches_updated_at
before update on public.marketplace_saved_searches
for each row execute function public.touch_marketplace_saved_searches_updated_at();

drop trigger if exists trg_set_marketplace_saved_searches_tenant_id on public.marketplace_saved_searches;
create trigger trg_set_marketplace_saved_searches_tenant_id
before insert on public.marketplace_saved_searches
for each row execute function public.set_tenant_id();

alter table public.marketplace_saved_searches enable row level security;

drop policy if exists "Marketplace saved searches tenant read" on public.marketplace_saved_searches;
create policy "Marketplace saved searches tenant read"
  on public.marketplace_saved_searches
  for select
  using (tenant_id = public.current_tenant_id());

drop policy if exists "Marketplace saved searches tenant insert" on public.marketplace_saved_searches;
create policy "Marketplace saved searches tenant insert"
  on public.marketplace_saved_searches
  for insert
  with check (tenant_id = public.current_tenant_id());

drop policy if exists "Marketplace saved searches tenant update" on public.marketplace_saved_searches;
create policy "Marketplace saved searches tenant update"
  on public.marketplace_saved_searches
  for update
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

drop policy if exists "Marketplace saved searches tenant delete" on public.marketplace_saved_searches;
create policy "Marketplace saved searches tenant delete"
  on public.marketplace_saved_searches
  for delete
  using (tenant_id = public.current_tenant_id());

grant select, insert, update, delete on public.marketplace_saved_searches to authenticated;

create table if not exists public.marketplace_notifications (
  notification_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  saved_search_id uuid not null references public.marketplace_saved_searches(saved_search_id) on delete cascade,
  lead_id uuid not null references public.marketplace_leads(lead_id) on delete cascade,
  lead_business_name text not null,
  lead_city text not null,
  lead_state text not null,
  lead_property_type text not null,
  lead_grade text not null,
  estimated_monthly_value numeric(12,2) not null default 0,
  estimated_annual_value numeric(12,2) not null default 0,
  close_probability numeric(5,2) not null default 0,
  match_summary text not null default '',
  matched_criteria jsonb not null default '{}'::jsonb,
  notification_email boolean not null default true,
  notification_in_app boolean not null default true,
  notification_sms boolean not null default false,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_notifications_unique_match unique (saved_search_id, lead_id)
);

create index if not exists marketplace_notifications_tenant_idx
  on public.marketplace_notifications(tenant_id, created_at desc);

create index if not exists marketplace_notifications_unread_idx
  on public.marketplace_notifications(tenant_id, is_read, created_at desc);

create index if not exists marketplace_notifications_saved_search_idx
  on public.marketplace_notifications(saved_search_id, created_at desc);

create index if not exists marketplace_notifications_lead_idx
  on public.marketplace_notifications(lead_id);

create or replace function public.touch_marketplace_notifications_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_marketplace_notifications_updated_at on public.marketplace_notifications;
create trigger trg_touch_marketplace_notifications_updated_at
before update on public.marketplace_notifications
for each row execute function public.touch_marketplace_notifications_updated_at();

alter table public.marketplace_notifications enable row level security;

drop policy if exists "Marketplace notifications tenant read" on public.marketplace_notifications;
create policy "Marketplace notifications tenant read"
  on public.marketplace_notifications
  for select
  using (tenant_id = public.current_tenant_id());

drop policy if exists "Marketplace notifications tenant update" on public.marketplace_notifications;
create policy "Marketplace notifications tenant update"
  on public.marketplace_notifications
  for update
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

drop policy if exists "Marketplace notifications tenant delete" on public.marketplace_notifications;
create policy "Marketplace notifications tenant delete"
  on public.marketplace_notifications
  for delete
  using (tenant_id = public.current_tenant_id());

grant select, update, delete on public.marketplace_notifications to authenticated;

create or replace function public.marketplace_saved_search_matches_lead(
  saved_search public.marketplace_saved_searches,
  lead_row public.marketplace_leads
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  search_state text := lower(trim(coalesce(saved_search.state, '')));
  search_city text := lower(trim(coalesce(saved_search.city, '')));
  search_property_type text := lower(trim(coalesce(saved_search.property_type, '')));
  lead_state text := lower(trim(coalesce(lead_row.state, '')));
  lead_city text := lower(trim(coalesce(lead_row.city, '')));
  lead_property_type text := lower(trim(coalesce(lead_row.property_type, '')));
  search_grade text := upper(trim(coalesce(saved_search.lead_grade, '')));
begin
  if search_state <> '' and lead_state <> search_state then
    return false;
  end if;

  if search_city <> '' then
    if saved_search.radius_miles <= 25 then
      if lead_city <> search_city then
        return false;
      end if;
    elsif saved_search.radius_miles <= 50 then
      if lead_city <> search_city and lead_state <> search_state then
        return false;
      end if;
    else
      if lead_state <> search_state then
        return false;
      end if;
    end if;
  end if;

  if search_property_type <> '' and lead_property_type not like '%' || search_property_type || '%' then
    return false;
  end if;

  if search_grade <> '' and upper(trim(coalesce(lead_row.lead_grade, ''))) <> search_grade then
    return false;
  end if;

  if saved_search.minimum_contract_value > 0 and lead_row.estimated_monthly_value < saved_search.minimum_contract_value then
    return false;
  end if;

  if saved_search.verified_only and lead_row.qualification_status <> 'Verified' then
    return false;
  end if;

  return true;
end;
$$;

create or replace function public.trg_marketplace_dispatch_saved_search_notifications()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and coalesce(old.qualification_status, '') = 'Verified' and new.qualification_status = 'Verified' then
    return new;
  end if;

  if new.qualification_status <> 'Verified' then
    return new;
  end if;

  insert into public.marketplace_notifications (
    tenant_id,
    saved_search_id,
    lead_id,
    lead_business_name,
    lead_city,
    lead_state,
    lead_property_type,
    lead_grade,
    estimated_monthly_value,
    estimated_annual_value,
    close_probability,
    match_summary,
    matched_criteria,
    notification_email,
    notification_in_app,
    notification_sms
  )
  select
    saved_search.tenant_id,
    saved_search.saved_search_id,
    new.lead_id,
    new.business_name,
    new.city,
    new.state,
    new.property_type,
    new.lead_grade,
    new.estimated_monthly_value,
    new.estimated_annual_value,
    new.close_probability,
    concat_ws(
      ' • ',
      case when coalesce(saved_search.verified_only, false) then 'Verified only' end,
      case when coalesce(saved_search.state, '') <> '' then 'State ' || saved_search.state end,
      case when coalesce(saved_search.city, '') <> '' then 'City ' || saved_search.city end,
      case when coalesce(saved_search.radius_miles, 0) > 0 and coalesce(saved_search.city, '') <> '' then 'Radius ' || saved_search.radius_miles || ' mi' end,
      case when coalesce(saved_search.property_type, '') <> '' then 'Property ' || saved_search.property_type end,
      case when coalesce(saved_search.lead_grade, '') <> '' then 'Grade ' || saved_search.lead_grade end,
      case when coalesce(saved_search.minimum_contract_value, 0) > 0 then 'Min ' || to_char(saved_search.minimum_contract_value, 'FM$999,999,990') end
    ),
    jsonb_build_object(
      'state', saved_search.state,
      'city', saved_search.city,
      'radiusMiles', saved_search.radius_miles,
      'propertyType', saved_search.property_type,
      'leadGrade', saved_search.lead_grade,
      'minimumContractValue', saved_search.minimum_contract_value,
      'verifiedOnly', saved_search.verified_only
    ),
    saved_search.notification_email,
    saved_search.notification_in_app,
    saved_search.notification_sms
  from public.marketplace_saved_searches saved_search
  where public.marketplace_saved_search_matches_lead(saved_search, new)
  on conflict (saved_search_id, lead_id) do nothing;

  update public.marketplace_saved_searches saved_search
  set
    last_matched_at = now(),
    updated_at = now()
  where public.marketplace_saved_search_matches_lead(saved_search, new);

  return new;
end;
$$;

drop trigger if exists trg_marketplace_dispatch_saved_search_notifications on public.marketplace_leads;
create trigger trg_marketplace_dispatch_saved_search_notifications
after insert or update of qualification_status on public.marketplace_leads
for each row
execute function public.trg_marketplace_dispatch_saved_search_notifications();
