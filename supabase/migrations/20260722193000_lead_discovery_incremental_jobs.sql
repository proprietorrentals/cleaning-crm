-- Lead Discovery incremental job processing
-- Converts long-running synchronous discovery into persisted batch jobs.

alter table public.lead_discovery_runs
  add column if not exists processed_count integer not null default 0,
  add column if not exists percent_complete numeric(5,2) not null default 0,
  add column if not exists stop_requested boolean not null default false,
  add column if not exists next_area_index integer not null default 0,
  add column if not exists next_category_index integer not null default 0,
  add column if not exists confidence_total numeric(12,2) not null default 0,
  add column if not exists confidence_count integer not null default 0;

update public.lead_discovery_runs
set status = 'failed',
    error_message = coalesce(error_message, 'Run was stopped before incremental status migration.')
where status = 'stopped';

alter table public.lead_discovery_runs
  drop constraint if exists lead_discovery_runs_status_check;
alter table public.lead_discovery_runs
  add constraint lead_discovery_runs_status_check
  check (status in ('pending', 'running', 'paused', 'completed', 'failed'));

alter table public.lead_discovery_runs
  drop constraint if exists lead_discovery_runs_processed_count_check;
alter table public.lead_discovery_runs
  add constraint lead_discovery_runs_processed_count_check
  check (processed_count >= 0);

alter table public.lead_discovery_runs
  drop constraint if exists lead_discovery_runs_percent_complete_check;
alter table public.lead_discovery_runs
  add constraint lead_discovery_runs_percent_complete_check
  check (percent_complete >= 0 and percent_complete <= 100);

create index if not exists lead_discovery_runs_status_progress_idx
  on public.lead_discovery_runs(status, percent_complete desc, started_at desc);
