-- Ensure jobs table supports employee job workflow fields.
-- Idempotent migration.

alter table public.jobs
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists assigned_employee_id uuid,
  add column if not exists signature_url text,
  add column if not exists status text;

alter table public.jobs
  alter column status set default 'Scheduled';

update public.jobs
set status = 'Scheduled'
where status is null or btrim(status) = '';

alter table public.jobs
  alter column status set not null;

-- Add FK for assigned employee if missing.
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

create index if not exists jobs_assigned_employee_id_idx
  on public.jobs(assigned_employee_id);

create index if not exists jobs_status_idx
  on public.jobs(status);

create index if not exists jobs_started_at_idx
  on public.jobs(started_at);

create index if not exists jobs_completed_at_idx
  on public.jobs(completed_at);
