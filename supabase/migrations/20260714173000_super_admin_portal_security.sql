-- Super Admin portal security and analytics support.
-- Adds super-admin scoped read access for platform metrics.
-- Adds feature flags and optional website traffic tables for portal modules.

create or replace function public.super_admin_total_users()
returns bigint
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.is_super_admin() then
    raise exception 'insufficient_privilege';
  end if;

  return (
    select count(*)::bigint
    from auth.users
  );
end;
$$;

grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.super_admin_total_users() to authenticated;

create or replace function public.super_admin_access_diagnostic()
returns table (
  auth_uid uuid,
  auth_email text,
  super_admin_row_id uuid,
  super_admin_row_email text,
  super_admin_row_matches boolean,
  is_super_admin_result boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    auth.uid() as auth_uid,
    coalesce(auth.jwt() ->> 'email', '') as auth_email,
    sa.id as super_admin_row_id,
    sa.email as super_admin_row_email,
    sa.id is not null as super_admin_row_matches,
    public.is_super_admin() as is_super_admin_result
  from (select 1) as singleton
  left join lateral (
    select id, email
    from public.super_admins
    where auth_user_id = auth.uid()
    limit 1
  ) as sa on true;
$$;

grant execute on function public.super_admin_access_diagnostic() to authenticated;

create table if not exists public.feature_flags (
  key text primary key,
  description text,
  enabled boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.feature_flags (key, description, enabled)
values
  ('sales_pipeline_v1', 'Enable sales pipeline dashboard and workflows', true),
  ('website_builder_v2', 'Enable next website builder experience', false),
  ('ai_ops_assistant', 'Enable AI assistant for operations center', false)
on conflict (key) do nothing;

create table if not exists public.website_traffic_daily (
  id uuid primary key default gen_random_uuid(),
  metric_date date not null,
  page_views integer not null default 0,
  unique_visitors integer not null default 0,
  sessions integer not null default 0,
  source text not null default 'unknown',
  created_at timestamptz not null default now(),
  unique (metric_date, source)
);

create index if not exists website_traffic_daily_metric_date_idx
  on public.website_traffic_daily(metric_date desc);

alter table public.feature_flags enable row level security;
alter table public.website_traffic_daily enable row level security;

drop policy if exists "Super admins manage feature flags" on public.feature_flags;
create policy "Super admins manage feature flags" on public.feature_flags
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Super admins read website traffic" on public.website_traffic_daily;
create policy "Super admins read website traffic" on public.website_traffic_daily
  for select
  using (public.is_super_admin());

drop policy if exists "Super admins manage website traffic" on public.website_traffic_daily;
create policy "Super admins manage website traffic" on public.website_traffic_daily
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Super admins read all customers" on public.customers;
create policy "Super admins read all customers" on public.customers
  for select
  using (public.is_super_admin());

drop policy if exists "Super admins read all employees" on public.employees;
create policy "Super admins read all employees" on public.employees
  for select
  using (public.is_super_admin());

drop policy if exists "Super admins read all sales leads" on public.sales_leads;
create policy "Super admins read all sales leads" on public.sales_leads
  for select
  using (public.is_super_admin());

drop policy if exists "Super admins read all lead status history" on public.sales_lead_status_history;
create policy "Super admins read all lead status history" on public.sales_lead_status_history
  for select
  using (public.is_super_admin());

drop policy if exists "Super admins read demo requests" on public.demo_requests;
create policy "Super admins read demo requests" on public.demo_requests
  for select
  using (public.is_super_admin());

grant select on public.customers to authenticated;
grant select on public.employees to authenticated;
grant select on public.sales_leads to authenticated;
grant select on public.sales_lead_status_history to authenticated;
grant select on public.demo_requests to authenticated;
grant select, insert, update, delete on public.feature_flags to authenticated;
grant select, insert, update, delete on public.website_traffic_daily to authenticated;
