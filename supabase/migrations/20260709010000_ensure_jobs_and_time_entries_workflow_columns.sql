-- Ensure required jobs workflow and time tracking columns exist.
-- Idempotent migration.

-- ─── JOBS WORKFLOW COLUMNS ───────────────────────────────────────────────────

alter table public.jobs
  add column if not exists scheduled_start_time time,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists status text,
  add column if not exists assigned_employee_id uuid;

update public.jobs
set scheduled_start_time = coalesce(scheduled_start_time, time '08:00:00')
where scheduled_start_time is null;

alter table public.jobs
  alter column scheduled_start_time set default time '08:00:00',
  alter column scheduled_start_time set not null;

update public.jobs
set status = coalesce(nullif(status, ''), 'Scheduled')
where status is null or btrim(status) = '';

alter table public.jobs
  alter column status set default 'Scheduled',
  alter column status set not null;

create index if not exists jobs_assigned_employee_id_idx
  on public.jobs(assigned_employee_id);

create index if not exists jobs_scheduled_start_time_idx
  on public.jobs(scheduled_start_time);

create index if not exists jobs_started_at_idx
  on public.jobs(started_at);

create index if not exists jobs_completed_at_idx
  on public.jobs(completed_at);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'jobs_assigned_employee_id_fkey'
      and conrelid = 'public.jobs'::regclass
  ) then
    alter table public.jobs
      add constraint jobs_assigned_employee_id_fkey
      foreign key (assigned_employee_id)
      references public.employees(id)
      on delete set null;
  end if;
end $$;

-- ─── TIME_ENTRIES CLOCK WORKFLOW COLUMNS ─────────────────────────────────────

alter table public.time_entries
  add column if not exists clock_in_time timestamptz,
  add column if not exists clock_out_time timestamptz,
  add column if not exists total_minutes integer;

update public.time_entries
set clock_in_time = coalesce(clock_in_time, clock_in)
where clock_in_time is null;

update public.time_entries
set clock_out_time = coalesce(clock_out_time, clock_out)
where clock_out_time is null;

update public.time_entries
set total_minutes = case
  when clock_in_time is not null and clock_out_time is not null
    then greatest(0, round(extract(epoch from (clock_out_time - clock_in_time)) / 60.0)::int)
  else total_minutes
end
where total_minutes is null;

alter table public.time_entries
  alter column clock_in_time set default now();

update public.time_entries
set status = coalesce(nullif(status, ''), 'clocked_in')
where status is null or btrim(status) = '';

alter table public.time_entries
  alter column status set default 'clocked_in';

create index if not exists time_entries_clock_in_time_idx
  on public.time_entries(clock_in_time);

create index if not exists time_entries_clock_out_time_idx
  on public.time_entries(clock_out_time);

create index if not exists time_entries_total_minutes_idx
  on public.time_entries(total_minutes);

create or replace function public.sync_time_entry_total_minutes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.clock_in_time is null then
    new.clock_in_time := now();
  end if;

  if new.clock_in is null then
    new.clock_in := new.clock_in_time;
  end if;

  if new.clock_out_time is not null and new.clock_out is null then
    new.clock_out := new.clock_out_time;
  end if;

  if new.clock_in_time is not null and new.clock_out_time is not null then
    new.total_minutes := greatest(
      0,
      round(extract(epoch from (new.clock_out_time - new.clock_in_time)) / 60.0)::int
    );

    if new.status is null or btrim(new.status) = '' or new.status = 'clocked_in' then
      new.status := 'clocked_out';
    end if;
  elsif new.status is null or btrim(new.status) = '' then
    new.status := 'clocked_in';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_time_entry_workflow_fields on public.time_entries;
drop trigger if exists trg_sync_time_entry_total_minutes on public.time_entries;

create trigger trg_sync_time_entry_total_minutes
before insert or update on public.time_entries
for each row execute function public.sync_time_entry_total_minutes();
