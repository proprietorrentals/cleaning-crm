-- Clock-in / clock-out workflow for employee time tracking.
-- Idempotent migration.

alter table public.time_entries
  add column if not exists clock_in_time timestamptz,
  add column if not exists clock_out_time timestamptz,
  add column if not exists total_time_worked interval,
  add column if not exists status text not null default 'clocked_in';

create index if not exists time_entries_status_idx
  on public.time_entries(status);

create or replace function public.sync_time_entry_workflow_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.clock_in_time is null and new.clock_in is not null then
    new.clock_in_time := new.clock_in;
  end if;

  if new.clock_in is null and new.clock_in_time is not null then
    new.clock_in := new.clock_in_time;
  end if;

  if new.clock_out_time is null and new.clock_out is not null then
    new.clock_out_time := new.clock_out;
  end if;

  if new.clock_out is null and new.clock_out_time is not null then
    new.clock_out := new.clock_out_time;
  end if;

  if new.clock_in_time is not null and new.clock_out_time is not null then
    new.total_time_worked := new.clock_out_time - new.clock_in_time;
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

create trigger trg_sync_time_entry_workflow_fields
before insert or update on public.time_entries
for each row execute function public.sync_time_entry_workflow_fields();

update public.time_entries
set
  clock_in_time = coalesce(clock_in_time, clock_in),
  clock_out_time = coalesce(clock_out_time, clock_out),
  total_time_worked = case
    when coalesce(clock_out_time, clock_out) is not null and coalesce(clock_in_time, clock_in) is not null
      then coalesce(clock_out_time, clock_out) - coalesce(clock_in_time, clock_in)
    else total_time_worked
  end,
  status = case
    when coalesce(clock_out_time, clock_out) is not null then 'clocked_out'
    when coalesce(status, '') = '' then 'clocked_in'
    else status
  end;