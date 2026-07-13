-- ServiceOS Task Assignments Phase 1
-- Adds tenant-aware task assignments, employee completion workflow, notifications,
-- and scoped storage policies for task completion files.

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  description text not null default '',
  assigned_employee_id uuid not null references public.employees(id) on delete restrict,
  job_id uuid references public.jobs(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  due_at timestamptz,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'assigned' check (status in ('assigned', 'in_progress', 'completed', 'cancelled')),
  completion_photo_required boolean not null default false,
  completion_photo_url text,
  employee_notes text,
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_tenant_due_idx
  on public.tasks(tenant_id, due_at asc nulls last);

create index if not exists tasks_tenant_assigned_idx
  on public.tasks(tenant_id, assigned_employee_id, status);

create index if not exists tasks_tenant_priority_idx
  on public.tasks(tenant_id, priority, status);

create index if not exists tasks_tenant_job_idx
  on public.tasks(tenant_id, job_id);

create index if not exists tasks_created_by_idx
  on public.tasks(created_by, created_at desc);

create table if not exists public.task_notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  recipient_employee_id uuid references public.employees(id) on delete cascade,
  recipient_user_id uuid references auth.users(id) on delete cascade,
  notification_type text not null check (notification_type in ('task_assigned', 'task_completed')),
  message text not null,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint task_notifications_recipient_required check (
    recipient_employee_id is not null or recipient_user_id is not null
  )
);

create index if not exists task_notifications_tenant_recipient_idx
  on public.task_notifications(tenant_id, recipient_employee_id, is_read, created_at desc);

create index if not exists task_notifications_tenant_admin_idx
  on public.task_notifications(tenant_id, recipient_user_id, is_read, created_at desc);

create index if not exists task_notifications_task_idx
  on public.task_notifications(task_id, created_at desc);

create or replace function public.touch_tasks_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();

  if new.status = 'completed' and new.completed_at is null then
    new.completed_at := now();
  elsif new.status <> 'completed' and old.status = 'completed' then
    new.completed_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_touch_tasks_updated_at on public.tasks;
create trigger trg_touch_tasks_updated_at
before update on public.tasks
for each row execute function public.touch_tasks_updated_at();

create or replace function public.validate_task_tenant_links()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  assigned_tenant uuid;
  related_job_tenant uuid;
begin
  select e.tenant_id
  into assigned_tenant
  from public.employees as e
  where e.id = new.assigned_employee_id
    and e.is_active = true;

  if assigned_tenant is null then
    raise exception 'Assigned employee is missing or inactive.';
  end if;

  if assigned_tenant <> new.tenant_id then
    raise exception 'Assigned employee tenant mismatch for this task.';
  end if;

  if new.job_id is not null then
    select j.tenant_id
    into related_job_tenant
    from public.jobs as j
    where j.id = new.job_id;

    if related_job_tenant is null then
      raise exception 'Related job does not exist.';
    end if;

    if related_job_tenant <> new.tenant_id then
      raise exception 'Invalid job assignment: job belongs to another tenant.';
    end if;
  end if;

  if new.status = 'completed' and coalesce(new.completion_photo_required, false) and coalesce(new.completion_photo_url, '') = '' then
    raise exception 'Completion photo is required before marking this task completed.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_task_tenant_links on public.tasks;
create trigger trg_validate_task_tenant_links
before insert or update on public.tasks
for each row execute function public.validate_task_tenant_links();

create or replace function public.enforce_employee_task_update_constraints()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.can_manage_operations_messages() then
    return new;
  end if;

  if new.tenant_id <> old.tenant_id
    or new.assigned_employee_id <> old.assigned_employee_id
    or new.created_by <> old.created_by
    or coalesce(new.job_id, '00000000-0000-0000-0000-000000000000'::uuid)
       <> coalesce(old.job_id, '00000000-0000-0000-0000-000000000000'::uuid)
    or new.priority <> old.priority
    or new.title <> old.title
    or coalesce(new.description, '') <> coalesce(old.description, '')
    or coalesce(new.notes, '') <> coalesce(old.notes, '')
    or coalesce(new.due_at, '-infinity'::timestamptz) <> coalesce(old.due_at, '-infinity'::timestamptz)
    or new.completion_photo_required <> old.completion_photo_required then
    raise exception 'Employees cannot modify protected task fields.';
  end if;

  if new.status not in ('assigned', 'in_progress', 'completed') then
    raise exception 'Employees can only set task status to assigned, in_progress, or completed.';
  end if;

  if old.status = 'cancelled' then
    raise exception 'Cancelled tasks cannot be modified by employees.';
  end if;

  if new.status = 'completed' and coalesce(new.completion_photo_required, false) and coalesce(new.completion_photo_url, '') = '' then
    raise exception 'Completion photo is required before completing this task.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_employee_task_update_constraints on public.tasks;
create trigger trg_enforce_employee_task_update_constraints
before update on public.tasks
for each row execute function public.enforce_employee_task_update_constraints();

create or replace function public.create_task_assignment_notification()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.assigned_employee_id <> old.assigned_employee_id then
    insert into public.task_notifications (
      tenant_id,
      task_id,
      recipient_employee_id,
      notification_type,
      message,
      is_read
    )
    values (
      new.tenant_id,
      new.id,
      new.assigned_employee_id,
      'task_assigned',
      'Task assigned: ' || new.title,
      false
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_task_assignment_notification on public.tasks;
create trigger trg_task_assignment_notification
after insert or update of assigned_employee_id on public.tasks
for each row execute function public.create_task_assignment_notification();

create or replace function public.create_task_completed_notifications()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'completed' and old.status is distinct from new.status then
    insert into public.task_notifications (
      tenant_id,
      task_id,
      recipient_user_id,
      notification_type,
      message,
      is_read
    )
    select
      new.tenant_id,
      new.id,
      ta.auth_user_id,
      'task_completed',
      'Task completed: ' || new.title,
      false
    from public.tenant_admins as ta
    where ta.tenant_id = new.tenant_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_task_completed_notifications on public.tasks;
create trigger trg_task_completed_notifications
after update of status on public.tasks
for each row execute function public.create_task_completed_notifications();

create or replace function public.storage_task_tenant_id_from_object_name(object_name text)
returns uuid
language sql
stable
as $$
  select case
    when split_part(object_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then split_part(object_name, '/', 1)::uuid
    else null
  end;
$$;

create or replace function public.storage_task_id_from_object_name(object_name text)
returns uuid
language sql
stable
as $$
  select case
    when split_part(object_name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then split_part(object_name, '/', 2)::uuid
    else null
  end;
$$;

insert into storage.buckets (id, name, public)
values ('task-files', 'task-files', false)
on conflict (id) do update set public = false;

alter table public.tasks enable row level security;
alter table public.task_notifications enable row level security;

drop policy if exists "Tasks managers manage" on public.tasks;
create policy "Tasks managers manage" on public.tasks
  for all
  using (
    public.can_manage_operations_messages()
    and tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
  )
  with check (
    public.can_manage_operations_messages()
    and tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
  );

drop policy if exists "Tasks employees view own" on public.tasks;
create policy "Tasks employees view own" on public.tasks
  for select
  using (
    tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
    and assigned_employee_id = public.current_employee_id()
  );

drop policy if exists "Tasks employees update own completion" on public.tasks;
create policy "Tasks employees update own completion" on public.tasks
  for update
  using (
    tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
    and assigned_employee_id = public.current_employee_id()
  )
  with check (
    tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
    and assigned_employee_id = public.current_employee_id()
    and status in ('assigned', 'in_progress', 'completed')
  );

drop policy if exists "Task notifications managers view" on public.task_notifications;
create policy "Task notifications managers view" on public.task_notifications
  for select
  using (
    public.can_manage_operations_messages()
    and tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
  );

drop policy if exists "Task notifications managers update" on public.task_notifications;
create policy "Task notifications managers update" on public.task_notifications
  for update
  using (
    public.can_manage_operations_messages()
    and tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
  )
  with check (
    public.can_manage_operations_messages()
    and tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
  );

drop policy if exists "Task notifications managers insert" on public.task_notifications;
create policy "Task notifications managers insert" on public.task_notifications
  for insert
  with check (
    public.can_manage_operations_messages()
    and tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
  );

drop policy if exists "Task notifications employees view own" on public.task_notifications;
create policy "Task notifications employees view own" on public.task_notifications
  for select
  using (
    tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
    and recipient_employee_id = public.current_employee_id()
  );

drop policy if exists "Task notifications employees update own" on public.task_notifications;
create policy "Task notifications employees update own" on public.task_notifications
  for update
  using (
    tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
    and recipient_employee_id = public.current_employee_id()
  )
  with check (
    tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
    and recipient_employee_id = public.current_employee_id()
  );

drop policy if exists "Task files managers manage" on storage.objects;
create policy "Task files managers manage"
  on storage.objects
  for all
  using (
    bucket_id = 'task-files'
    and public.can_manage_operations_messages()
    and exists (
      select 1
      from public.tasks as t
      where t.id = public.storage_task_id_from_object_name(name)
        and t.tenant_id = public.storage_task_tenant_id_from_object_name(name)
        and t.tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
    )
  )
  with check (
    bucket_id = 'task-files'
    and public.can_manage_operations_messages()
    and exists (
      select 1
      from public.tasks as t
      where t.id = public.storage_task_id_from_object_name(name)
        and t.tenant_id = public.storage_task_tenant_id_from_object_name(name)
        and t.tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
    )
  );

drop policy if exists "Task files employees select own" on storage.objects;
create policy "Task files employees select own"
  on storage.objects
  for select
  using (
    bucket_id = 'task-files'
    and exists (
      select 1
      from public.tasks as t
      where t.id = public.storage_task_id_from_object_name(name)
        and t.tenant_id = public.storage_task_tenant_id_from_object_name(name)
        and t.tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
        and t.assigned_employee_id = public.current_employee_id()
    )
  );

drop policy if exists "Task files employees upload own" on storage.objects;
create policy "Task files employees upload own"
  on storage.objects
  for insert
  with check (
    bucket_id = 'task-files'
    and exists (
      select 1
      from public.tasks as t
      where t.id = public.storage_task_id_from_object_name(name)
        and t.tenant_id = public.storage_task_tenant_id_from_object_name(name)
        and t.tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
        and t.assigned_employee_id = public.current_employee_id()
    )
  );

drop policy if exists "Task files employees update own" on storage.objects;
create policy "Task files employees update own"
  on storage.objects
  for update
  using (
    bucket_id = 'task-files'
    and exists (
      select 1
      from public.tasks as t
      where t.id = public.storage_task_id_from_object_name(name)
        and t.tenant_id = public.storage_task_tenant_id_from_object_name(name)
        and t.tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
        and t.assigned_employee_id = public.current_employee_id()
    )
  )
  with check (
    bucket_id = 'task-files'
    and exists (
      select 1
      from public.tasks as t
      where t.id = public.storage_task_id_from_object_name(name)
        and t.tenant_id = public.storage_task_tenant_id_from_object_name(name)
        and t.tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
        and t.assigned_employee_id = public.current_employee_id()
    )
  );