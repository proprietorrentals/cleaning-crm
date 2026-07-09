-- Add customer verification fields for signature workflow.
-- Idempotent migration.

alter table public.jobs
  add column if not exists signature_status text,
  add column if not exists signature_reason text,
  add column if not exists signature_notes text,
  add column if not exists attempted_signature_at timestamptz;

update public.jobs
set signature_status = case
  when signature_url is not null then 'signed'
  else 'pending'
end
where signature_status is null;

alter table public.jobs
  alter column signature_status set default 'pending';

create index if not exists jobs_signature_status_idx
  on public.jobs(signature_status);

create index if not exists jobs_attempted_signature_at_idx
  on public.jobs(attempted_signature_at);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'jobs_signature_status_check'
      and conrelid = 'public.jobs'::regclass
  ) then
    alter table public.jobs
      add constraint jobs_signature_status_check
      check (signature_status in ('pending', 'signed', 'unavailable'));
  end if;
end $$;
