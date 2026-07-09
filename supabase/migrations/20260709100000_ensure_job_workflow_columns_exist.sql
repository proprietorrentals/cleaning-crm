-- Ensure the jobs workflow columns exist for employee portal actions.
-- Idempotent: safe to run against databases that already have these columns.

alter table public.jobs
  add column if not exists scheduled_start_time time,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz;

update public.jobs
set scheduled_start_time = coalesce(scheduled_start_time, time '08:00:00')
where scheduled_start_time is null;

alter table public.jobs
  alter column scheduled_start_time set default time '08:00:00';

create index if not exists jobs_scheduled_start_time_idx
  on public.jobs(scheduled_start_time);

create index if not exists jobs_started_at_idx
  on public.jobs(started_at);

create index if not exists jobs_completed_at_idx
  on public.jobs(completed_at);