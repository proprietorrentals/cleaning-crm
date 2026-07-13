-- ServiceOS Quote Pricing Configuration Phase 1
-- Tenant-scoped quote pricing configuration and line-item quote snapshots.

create or replace function public.can_manage_quote_pricing()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
  or exists (
    select 1
    from public.super_admins
    where auth_user_id = auth.uid()
  );
$$;

create table if not exists public.quote_pricing_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  base_service_fee numeric(12,2) not null default 0,
  price_per_square_foot numeric(12,4) not null default 0.12,
  restroom_pricing_mode text not null default 'per_restroom' check (restroom_pricing_mode in ('per_restroom', 'per_fixture')),
  restroom_unit_price numeric(12,2) not null default 0,
  kitchen_breakroom_price numeric(12,2) not null default 0,
  floor_care_price numeric(12,2) not null default 0,
  carpet_cleaning_price numeric(12,2) not null default 0,
  window_cleaning_price numeric(12,2) not null default 0,
  frequency_multiplier_one_time numeric(8,4) not null default 1,
  frequency_multiplier_daily numeric(8,4) not null default 1,
  frequency_multiplier_weekly numeric(8,4) not null default 1,
  frequency_multiplier_biweekly numeric(8,4) not null default 1,
  frequency_multiplier_monthly numeric(8,4) not null default 1,
  minimum_job_price numeric(12,2),
  travel_service_fee numeric(12,2),
  tax_rate_percent numeric(8,4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists quote_pricing_settings_tenant_uidx
  on public.quote_pricing_settings(tenant_id);

create table if not exists public.quote_pricing_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  pricing_type text not null check (pricing_type in ('flat', 'quantity', 'square_foot', 'percentage')),
  unit_price numeric(12,4) not null default 0,
  customer_description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quote_pricing_items_tenant_active_idx
  on public.quote_pricing_items(tenant_id, is_active, sort_order, created_at);

create table if not exists public.quote_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  item_key text,
  item_name text not null,
  pricing_type text not null check (pricing_type in ('flat', 'quantity', 'square_foot', 'percentage', 'tax', 'minimum', 'override')),
  quantity numeric(12,4),
  unit_price numeric(12,4),
  amount numeric(12,2) not null,
  customer_description text,
  customer_visible boolean not null default true,
  internal_description text,
  is_override boolean not null default false,
  override_reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists quote_line_items_quote_idx
  on public.quote_line_items(quote_id, created_at);

create index if not exists quote_line_items_tenant_idx
  on public.quote_line_items(tenant_id, quote_id);

alter table public.quotes
  add column if not exists status text not null default 'Pending' check (status in ('Pending', 'Sent', 'Approved', 'Rejected')),
  add column if not exists pricing_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists manual_total_override boolean not null default false,
  add column if not exists manual_total_override_reason text;

update public.quotes
set status = coalesce(status, 'Pending')
where status is null;

create or replace function public.touch_quote_pricing_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_quote_pricing_settings_updated_at on public.quote_pricing_settings;
create trigger trg_touch_quote_pricing_settings_updated_at
before update on public.quote_pricing_settings
for each row execute function public.touch_quote_pricing_updated_at();

drop trigger if exists trg_touch_quote_pricing_items_updated_at on public.quote_pricing_items;
create trigger trg_touch_quote_pricing_items_updated_at
before update on public.quote_pricing_items
for each row execute function public.touch_quote_pricing_updated_at();

alter table public.quote_pricing_settings enable row level security;
alter table public.quote_pricing_items enable row level security;
alter table public.quote_line_items enable row level security;

drop policy if exists "Quote pricing settings manage" on public.quote_pricing_settings;
create policy "Quote pricing settings manage" on public.quote_pricing_settings
  for all
  using (
    public.can_manage_quote_pricing()
    and tenant_id = public.current_tenant_id()
  )
  with check (
    public.can_manage_quote_pricing()
    and tenant_id = public.current_tenant_id()
  );

drop policy if exists "Quote pricing items manage" on public.quote_pricing_items;
create policy "Quote pricing items manage" on public.quote_pricing_items
  for all
  using (
    public.can_manage_quote_pricing()
    and tenant_id = public.current_tenant_id()
  )
  with check (
    public.can_manage_quote_pricing()
    and tenant_id = public.current_tenant_id()
  );

drop policy if exists "Quote line items admins manage" on public.quote_line_items;
create policy "Quote line items admins manage" on public.quote_line_items
  for all
  using (
    public.can_manage_quote_pricing()
    and tenant_id = public.current_tenant_id()
  )
  with check (
    public.can_manage_quote_pricing()
    and tenant_id = public.current_tenant_id()
  );

drop policy if exists "Quote line items customers view own" on public.quote_line_items;
create policy "Quote line items customers view own" on public.quote_line_items
  for select
  using (
    customer_visible = true
    and tenant_id = public.current_tenant_id()
    and exists (
      select 1
      from public.quotes as q
      join public.customers as c on c.id = q.customer_id
      where q.id = quote_id
        and q.tenant_id = quote_line_items.tenant_id
        and c.user_id = auth.uid()
    )
  );

-- Seed default settings row per tenant if missing.
insert into public.quote_pricing_settings (
  tenant_id,
  base_service_fee,
  price_per_square_foot,
  restroom_pricing_mode,
  restroom_unit_price,
  kitchen_breakroom_price,
  floor_care_price,
  carpet_cleaning_price,
  window_cleaning_price,
  frequency_multiplier_one_time,
  frequency_multiplier_daily,
  frequency_multiplier_weekly,
  frequency_multiplier_biweekly,
  frequency_multiplier_monthly,
  minimum_job_price,
  travel_service_fee,
  tax_rate_percent
)
select
  t.id,
  0,
  0.12,
  'per_restroom',
  0,
  0,
  0,
  0,
  0,
  1,
  0.95,
  1,
  1,
  1.08,
  null,
  null,
  0
from public.tenants as t
where not exists (
  select 1
  from public.quote_pricing_settings as s
  where s.tenant_id = t.id
);
