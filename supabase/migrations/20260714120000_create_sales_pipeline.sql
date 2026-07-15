-- ServiceOS Sales Pipeline
-- Adds tenant-aware sales lead tracking, status history, and RLS controls.
-- Idempotent migration.

create or replace function public.can_manage_sales_leads()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tenant_admins where auth_user_id = auth.uid()
  )
  or exists (
    select 1 from public.super_admins where auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.employees
    where auth_user_id = auth.uid()
      and is_active = true
      and lower(coalesce(role, '')) in ('supervisor', 'manager')
  );
$$;

create table if not exists public.sales_leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  contact_name text not null,
  company_name text,
  email text not null,
  phone text,
  employee_count text,
  business_type text,
  current_software text,
  message text,
  source text not null default 'website',
  status text not null default 'new',
  assigned_to uuid references public.employees(id) on delete set null,
  next_follow_up_at timestamptz,
  demo_scheduled_at timestamptz,
  proposal_amount numeric,
  lost_reason text,
  founding_partner_interest boolean not null default false,
  internal_notes text,
  converted_customer_id uuid references public.customers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sales_leads add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;
alter table public.sales_leads add column if not exists contact_name text;
alter table public.sales_leads add column if not exists company_name text;
alter table public.sales_leads add column if not exists email text;
alter table public.sales_leads add column if not exists phone text;
alter table public.sales_leads add column if not exists employee_count text;
alter table public.sales_leads add column if not exists business_type text;
alter table public.sales_leads add column if not exists current_software text;
alter table public.sales_leads add column if not exists message text;
alter table public.sales_leads add column if not exists source text default 'website';
alter table public.sales_leads add column if not exists status text default 'new';
alter table public.sales_leads add column if not exists assigned_to uuid references public.employees(id) on delete set null;
alter table public.sales_leads add column if not exists next_follow_up_at timestamptz;
alter table public.sales_leads add column if not exists demo_scheduled_at timestamptz;
alter table public.sales_leads add column if not exists proposal_amount numeric;
alter table public.sales_leads add column if not exists lost_reason text;
alter table public.sales_leads add column if not exists founding_partner_interest boolean not null default false;
alter table public.sales_leads add column if not exists internal_notes text;
alter table public.sales_leads add column if not exists converted_customer_id uuid references public.customers(id) on delete set null;
alter table public.sales_leads add column if not exists created_at timestamptz not null default now();
alter table public.sales_leads add column if not exists updated_at timestamptz not null default now();

update public.sales_leads set source = coalesce(nullif(source, ''), 'website') where source is null or source = '';
update public.sales_leads set status = coalesce(nullif(status, ''), 'new') where status is null or status = '';
update public.sales_leads set founding_partner_interest = false where founding_partner_interest is null;
update public.sales_leads set created_at = now() where created_at is null;
update public.sales_leads set updated_at = now() where updated_at is null;

alter table public.sales_leads alter column tenant_id set not null;
alter table public.sales_leads alter column contact_name set not null;
alter table public.sales_leads alter column email set not null;
alter table public.sales_leads alter column source set default 'website';
alter table public.sales_leads alter column source set not null;
alter table public.sales_leads alter column status set default 'new';
alter table public.sales_leads alter column status set not null;
alter table public.sales_leads alter column founding_partner_interest set default false;
alter table public.sales_leads alter column founding_partner_interest set not null;
alter table public.sales_leads alter column created_at set default now();
alter table public.sales_leads alter column created_at set not null;
alter table public.sales_leads alter column updated_at set default now();
alter table public.sales_leads alter column updated_at set not null;

alter table public.sales_leads drop constraint if exists sales_leads_status_check;
alter table public.sales_leads
  add constraint sales_leads_status_check
  check (status in ('new', 'contacted', 'demo_scheduled', 'proposal_sent', 'won', 'lost'));

alter table public.sales_leads drop constraint if exists sales_leads_source_check;
alter table public.sales_leads
  add constraint sales_leads_source_check
  check (source in ('website', 'website_contact', 'demo_request', 'founding_partner', 'free_trial'));

create index if not exists sales_leads_tenant_idx on public.sales_leads(tenant_id);
create index if not exists sales_leads_status_idx on public.sales_leads(status);
create index if not exists sales_leads_source_idx on public.sales_leads(source);
create index if not exists sales_leads_email_idx on public.sales_leads(email);
create index if not exists sales_leads_follow_up_idx on public.sales_leads(next_follow_up_at);
create index if not exists sales_leads_created_at_idx on public.sales_leads(created_at desc);
create index if not exists sales_leads_tenant_status_idx on public.sales_leads(tenant_id, status, created_at desc);
create index if not exists sales_leads_tenant_source_idx on public.sales_leads(tenant_id, source);

create table if not exists public.sales_lead_status_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.sales_leads(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists sales_lead_status_history_lead_idx
  on public.sales_lead_status_history(lead_id, changed_at desc);

create index if not exists sales_lead_status_history_tenant_idx
  on public.sales_lead_status_history(tenant_id, changed_at desc);

create or replace function public.touch_sales_leads_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_sales_leads_updated_at on public.sales_leads;
create trigger trg_touch_sales_leads_updated_at
before update on public.sales_leads
for each row execute function public.touch_sales_leads_updated_at();

create or replace function public.log_sales_lead_status_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.sales_lead_status_history (
      lead_id,
      tenant_id,
      from_status,
      to_status,
      changed_by,
      changed_at
    )
    values (
      new.id,
      new.tenant_id,
      old.status,
      new.status,
      auth.uid(),
      now()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_log_sales_lead_status_change on public.sales_leads;
create trigger trg_log_sales_lead_status_change
after update on public.sales_leads
for each row execute function public.log_sales_lead_status_change();

alter table public.sales_leads enable row level security;
alter table public.sales_lead_status_history enable row level security;

drop policy if exists "Sales leads manage by tenant sales users" on public.sales_leads;
create policy "Sales leads manage by tenant sales users" on public.sales_leads
  for all
  using (
    public.can_manage_sales_leads()
    and tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
  )
  with check (
    public.can_manage_sales_leads()
    and tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
  );

drop policy if exists "Sales lead status history read by tenant sales users" on public.sales_lead_status_history;
create policy "Sales lead status history read by tenant sales users" on public.sales_lead_status_history
  for select
  using (
    public.can_manage_sales_leads()
    and tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
  );

drop policy if exists "Sales lead status history insert by tenant sales users" on public.sales_lead_status_history;
create policy "Sales lead status history insert by tenant sales users" on public.sales_lead_status_history
  for insert
  with check (
    public.can_manage_sales_leads()
    and tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
  );
