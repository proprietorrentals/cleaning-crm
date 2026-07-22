-- Lead Discovery batch locking
-- Prevents overlapping workers from processing the same queued batch.

alter table public.lead_discovery_runs
  add column if not exists processing_locked_at timestamptz,
  add column if not exists processing_locked_by text;

create index if not exists lead_discovery_runs_processing_lock_idx
  on public.lead_discovery_runs(status, processing_locked_at desc)
  where status in ('pending', 'running');
