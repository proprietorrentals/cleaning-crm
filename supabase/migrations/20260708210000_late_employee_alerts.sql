-- Supervisor-only late employee alerts.
-- Idempotent migration.

-- ─── JOBS: scheduled start time ─────────────────────────────────────────────

alter table public.jobs
  add column if not exists scheduled_start_time time;

update public.jobs
set scheduled_start_time = coalesce(scheduled_start_time, time '08:00:00');

alter table public.jobs
  alter column scheduled_start_time set default time '08:00:00',
  alter column scheduled_start_time set not null;

create index if not exists jobs_scheduled_start_time_idx
  on public.jobs(scheduled_start_time);

-- ─── SETTINGS: late clock-in grace period ───────────────────────────────────

alter table public.settings
  add column if not exists late_clock_in_grace_period_minutes integer;

update public.settings
set late_clock_in_grace_period_minutes = coalesce(late_clock_in_grace_period_minutes, 15);

alter table public.settings
  alter column late_clock_in_grace_period_minutes set default 15,
  alter column late_clock_in_grace_period_minutes set not null;

-- ─── LATE EMPLOYEE ALERTS ───────────────────────────────────────────────────

create table if not exists public.late_employee_alerts (
  id                          uuid        primary key default gen_random_uuid(),
  tenant_id                   uuid        not null references public.tenants(id) on delete cascade,
  job_id                      uuid        not null references public.jobs(id) on delete cascade,
  employee_id                 uuid        not null references public.employees(id) on delete cascade,
  employee_name               text        not null,
  customer_id                 uuid        not null references public.customers(id) on delete cascade,
  customer_name               text        not null,
  scheduled_start_at          timestamptz not null,
  grace_period_minutes        integer     not null default 15,
  minutes_late                integer     not null,
  status                      text        not null default 'pending'
                               check (status in ('pending', 'acknowledged', 'resolved')),
  detected_at                 timestamptz not null default now(),
  acknowledged_at             timestamptz,
  acknowledged_by             uuid references auth.users(id) on delete set null,
  resolved_at                 timestamptz,
  resolved_by                 uuid references auth.users(id) on delete set null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint late_employee_alerts_tenant_job_key unique (tenant_id, job_id)
);

create index if not exists late_employee_alerts_tenant_id_idx
  on public.late_employee_alerts(tenant_id);

create index if not exists late_employee_alerts_status_idx
  on public.late_employee_alerts(status);

create index if not exists late_employee_alerts_detected_at_idx
  on public.late_employee_alerts(detected_at desc);

create or replace function public.set_late_employee_alerts_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_set_late_employee_alerts_updated_at on public.late_employee_alerts;

create trigger trg_set_late_employee_alerts_updated_at
before update on public.late_employee_alerts
for each row execute function public.set_late_employee_alerts_updated_at();

create or replace function public.sync_late_employee_alerts()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tenant_grace_minutes integer := 15;
begin
  if not public.is_admin() then
    return;
  end if;

  select coalesce(s.late_clock_in_grace_period_minutes, 15)
  into tenant_grace_minutes
  from public.settings s
  where s.tenant_id = public.current_tenant_id()
  limit 1;

  insert into public.late_employee_alerts (
    tenant_id,
    job_id,
    employee_id,
    employee_name,
    customer_id,
    customer_name,
    scheduled_start_at,
    grace_period_minutes,
    minutes_late,
    status,
    detected_at,
    created_at,
    updated_at
  )
  select
    j.tenant_id,
    j.id,
    j.assigned_employee_id,
    concat_ws(' ', e.first_name, e.last_name),
    j.customer_id,
    c.company_name,
    (j.scheduled_date::timestamp + j.scheduled_start_time)::timestamptz,
    tenant_grace_minutes,
    greatest(
      1,
      ceil(
        extract(
          epoch from (
            now() - ((j.scheduled_date::timestamp + j.scheduled_start_time)::timestamptz + make_interval(mins => tenant_grace_minutes))
          )
        ) / 60.0
      )::int
    ),
    'pending',
    now(),
    now(),
    now()
  from public.jobs j
  join public.customers c on c.id = j.customer_id
  left join public.employees e on e.id = j.assigned_employee_id
  where j.tenant_id = public.current_tenant_id()
    and j.assigned_employee_id is not null
    and j.status in ('Scheduled', 'In Progress')
    and now() > ((j.scheduled_date::timestamp + j.scheduled_start_time)::timestamptz + make_interval(mins => tenant_grace_minutes))
    and not exists (
      select 1
      from public.time_entries te
      where te.tenant_id = j.tenant_id
        and te.employee_id = j.assigned_employee_id
        and te.clock_in_time <= ((j.scheduled_date::timestamp + j.scheduled_start_time)::timestamptz + make_interval(mins => tenant_grace_minutes))
    )
  on conflict (tenant_id, job_id) do nothing;
end;
$$;

grant execute on function public.sync_late_employee_alerts() to anon;
grant execute on function public.sync_late_employee_alerts() to authenticated;

-- ─── RLS ────────────────────────────────────────────────────────────────────

alter table public.late_employee_alerts enable row level security;

drop policy if exists "Admins manage own tenant late alerts" on public.late_employee_alerts;

create policy "Admins manage own tenant late alerts" on public.late_employee_alerts
  for all
  using (public.is_admin() and tenant_id = public.current_tenant_id())
  with check (public.is_admin() and tenant_id = public.current_tenant_id());