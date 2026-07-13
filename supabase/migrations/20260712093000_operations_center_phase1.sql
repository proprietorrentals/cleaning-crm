-- Operations Center Phase 1
-- Adds tenant-aware operational communication tables, RLS, and default team channels.

create or replace function public.can_manage_operations_messages()
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

create or replace function public.employee_channel_scope_access(scope_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees as e
    where e.auth_user_id = auth.uid()
      and e.is_active = true
      and (
        scope_key = 'all'
        or (scope_key = 'supervisors' and lower(coalesce(e.role, '')) in ('supervisor', 'manager'))
        or (scope_key = 'night_shift' and lower(coalesce(e.department, '')) like '%night%')
        or (scope_key = 'day_shift' and lower(coalesce(e.department, '')) like '%day%')
        or (scope_key = 'route_teams' and lower(coalesce(e.department, '')) like '%route%')
      )
  );
$$;

create table if not exists public.message_threads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  thread_type text not null check (thread_type in ('job', 'channel')),
  title text not null,
  job_id uuid references public.jobs(id) on delete cascade,
  channel_key text check (channel_key in ('supervisors', 'night_shift', 'day_shift', 'route_teams')),
  channel_scope text not null default 'all' check (channel_scope in ('all', 'supervisors', 'night_shift', 'day_shift', 'route_teams')),
  created_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  ai_summary jsonb,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint message_threads_job_required check ((thread_type = 'job' and job_id is not null) or (thread_type = 'channel' and channel_key is not null))
);

create unique index if not exists message_threads_unique_job_thread_idx
  on public.message_threads(tenant_id, job_id)
  where thread_type = 'job' and job_id is not null;

create unique index if not exists message_threads_unique_channel_idx
  on public.message_threads(tenant_id, channel_key)
  where thread_type = 'channel' and channel_key is not null;

create index if not exists message_threads_tenant_type_idx
  on public.message_threads(tenant_id, thread_type);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  sender_employee_id uuid references public.employees(id) on delete set null,
  body text not null,
  priority text not null default 'normal' check (priority in ('normal', 'important', 'urgent')),
  attachment_url text,
  attachment_type text check (attachment_type in ('photo', 'file')),
  attachment_name text,
  metadata jsonb not null default '{}'::jsonb,
  ai_tags jsonb,
  created_at timestamptz not null default now()
);

create index if not exists messages_thread_created_idx
  on public.messages(thread_id, created_at desc);

create index if not exists messages_tenant_priority_idx
  on public.messages(tenant_id, priority);

create table if not exists public.message_reads (
  message_id uuid not null references public.messages(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  read_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (message_id, employee_id)
);

create index if not exists message_reads_tenant_employee_idx
  on public.message_reads(tenant_id, employee_id, read_at desc);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  body text not null,
  priority text not null default 'normal' check (priority in ('normal', 'important', 'urgent')),
  audience_scope text not null default 'all' check (audience_scope in ('all', 'supervisors', 'night_shift', 'day_shift', 'route_teams')),
  requires_ack boolean not null default false,
  created_by uuid not null references auth.users(id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb,
  ai_summary jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists announcements_tenant_created_idx
  on public.announcements(tenant_id, created_at desc);

create table if not exists public.announcement_reads (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  read_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (announcement_id, employee_id)
);

create index if not exists announcement_reads_tenant_employee_idx
  on public.announcement_reads(tenant_id, employee_id, read_at desc);

create or replace function public.touch_operations_center_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_message_threads_updated_at on public.message_threads;
create trigger trg_touch_message_threads_updated_at
before update on public.message_threads
for each row execute function public.touch_operations_center_updated_at();

drop trigger if exists trg_touch_announcements_updated_at on public.announcements;
create trigger trg_touch_announcements_updated_at
before update on public.announcements
for each row execute function public.touch_operations_center_updated_at();

create or replace function public.bump_thread_last_message_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.message_threads
  set last_message_at = now(),
      updated_at = now()
  where id = new.thread_id;

  return new;
end;
$$;

drop trigger if exists trg_bump_thread_last_message_at on public.messages;
create trigger trg_bump_thread_last_message_at
after insert on public.messages
for each row execute function public.bump_thread_last_message_at();

create or replace function public.can_access_message_thread(thread_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.message_threads as mt
    where mt.id = thread_uuid
      and mt.tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
      and (
        public.can_manage_operations_messages()
        or (
          mt.thread_type = 'job'
          and exists (
            select 1
            from public.jobs as j
            where j.id = mt.job_id
              and j.tenant_id = mt.tenant_id
              and j.assigned_employee_id = public.current_employee_id()
          )
        )
        or (
          mt.thread_type = 'channel'
          and public.employee_channel_scope_access(mt.channel_scope)
        )
      )
  );
$$;

insert into public.message_threads (tenant_id, thread_type, title, channel_key, channel_scope, metadata)
select t.id, 'channel', 'Supervisors', 'supervisors', 'supervisors', jsonb_build_object('default', true)
from public.tenants as t
where not exists (
  select 1
  from public.message_threads as mt
  where mt.tenant_id = t.id and mt.thread_type = 'channel' and mt.channel_key = 'supervisors'
);

insert into public.message_threads (tenant_id, thread_type, title, channel_key, channel_scope, metadata)
select t.id, 'channel', 'Night Shift', 'night_shift', 'night_shift', jsonb_build_object('default', true)
from public.tenants as t
where not exists (
  select 1
  from public.message_threads as mt
  where mt.tenant_id = t.id and mt.thread_type = 'channel' and mt.channel_key = 'night_shift'
);

insert into public.message_threads (tenant_id, thread_type, title, channel_key, channel_scope, metadata)
select t.id, 'channel', 'Day Shift', 'day_shift', 'day_shift', jsonb_build_object('default', true)
from public.tenants as t
where not exists (
  select 1
  from public.message_threads as mt
  where mt.tenant_id = t.id and mt.thread_type = 'channel' and mt.channel_key = 'day_shift'
);

insert into public.message_threads (tenant_id, thread_type, title, channel_key, channel_scope, metadata)
select t.id, 'channel', 'Route Teams', 'route_teams', 'route_teams', jsonb_build_object('default', true)
from public.tenants as t
where not exists (
  select 1
  from public.message_threads as mt
  where mt.tenant_id = t.id and mt.thread_type = 'channel' and mt.channel_key = 'route_teams'
);

insert into storage.buckets (id, name, public)
values ('operations-center-files', 'operations-center-files', true)
on conflict (id) do nothing;

create or replace function public.storage_thread_id_from_object_name(object_name text)
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

alter table public.message_threads enable row level security;
alter table public.messages enable row level security;
alter table public.message_reads enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_reads enable row level security;

drop policy if exists "Operations thread access" on public.message_threads;
create policy "Operations thread access" on public.message_threads
  for select
  using (public.can_access_message_thread(id));

drop policy if exists "Operations managers create threads" on public.message_threads;
create policy "Operations managers create threads" on public.message_threads
  for insert
  with check (
    public.can_manage_operations_messages()
    and tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
    and (
      (thread_type = 'job' and exists (
        select 1 from public.jobs as j
        where j.id = job_id
          and j.tenant_id = tenant_id
      ))
      or (thread_type = 'channel')
    )
  );

drop policy if exists "Operations managers update threads" on public.message_threads;
create policy "Operations managers update threads" on public.message_threads
  for update
  using (
    public.can_manage_operations_messages()
    and tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
  )
  with check (
    public.can_manage_operations_messages()
    and tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
  );

drop policy if exists "Operations message select" on public.messages;
create policy "Operations message select" on public.messages
  for select
  using (
    tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
    and public.can_access_message_thread(thread_id)
  );

drop policy if exists "Operations message insert" on public.messages;
create policy "Operations message insert" on public.messages
  for insert
  with check (
    tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
    and sender_user_id = auth.uid()
    and public.can_access_message_thread(thread_id)
    and (
      sender_employee_id = public.current_employee_id()
      or public.can_manage_operations_messages()
    )
  );

drop policy if exists "Operations managers update messages" on public.messages;
create policy "Operations managers update messages" on public.messages
  for update
  using (
    public.can_manage_operations_messages()
    and tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
  )
  with check (
    public.can_manage_operations_messages()
    and tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
  );

drop policy if exists "Operations message reads select" on public.message_reads;
create policy "Operations message reads select" on public.message_reads
  for select
  using (
    tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
    and (
      employee_id = public.current_employee_id()
      or public.can_manage_operations_messages()
    )
  );

drop policy if exists "Operations message reads insert" on public.message_reads;
create policy "Operations message reads insert" on public.message_reads
  for insert
  with check (
    tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
    and employee_id = public.current_employee_id()
    and exists (
      select 1
      from public.messages as m
      where m.id = message_id
        and m.tenant_id = tenant_id
        and public.can_access_message_thread(m.thread_id)
    )
  );

drop policy if exists "Operations message reads update" on public.message_reads;
create policy "Operations message reads update" on public.message_reads
  for update
  using (
    tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
    and employee_id = public.current_employee_id()
  )
  with check (
    tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
    and employee_id = public.current_employee_id()
  );

drop policy if exists "Operations announcements select" on public.announcements;
create policy "Operations announcements select" on public.announcements
  for select
  using (
    tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
    and (
      public.can_manage_operations_messages()
      or public.employee_channel_scope_access(audience_scope)
    )
  );

drop policy if exists "Operations announcements manage" on public.announcements;
create policy "Operations announcements manage" on public.announcements
  for all
  using (
    public.can_manage_operations_messages()
    and tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
  )
  with check (
    public.can_manage_operations_messages()
    and tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
  );

drop policy if exists "Operations announcement reads select" on public.announcement_reads;
create policy "Operations announcement reads select" on public.announcement_reads
  for select
  using (
    tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
    and (
      employee_id = public.current_employee_id()
      or public.can_manage_operations_messages()
    )
  );

drop policy if exists "Operations announcement reads insert" on public.announcement_reads;
create policy "Operations announcement reads insert" on public.announcement_reads
  for insert
  with check (
    tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
    and employee_id = public.current_employee_id()
    and exists (
      select 1
      from public.announcements as a
      where a.id = announcement_id
        and a.tenant_id = tenant_id
        and (
          public.can_manage_operations_messages()
          or public.employee_channel_scope_access(a.audience_scope)
        )
    )
  );

drop policy if exists "Operations announcement reads update" on public.announcement_reads;
create policy "Operations announcement reads update" on public.announcement_reads
  for update
  using (
    tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
    and employee_id = public.current_employee_id()
  )
  with check (
    tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
    and employee_id = public.current_employee_id()
  );

drop policy if exists "Operations files select" on storage.objects;
create policy "Operations files select"
  on storage.objects
  for select
  using (
    bucket_id = 'operations-center-files'
    and public.can_access_message_thread(public.storage_thread_id_from_object_name(name))
  );

drop policy if exists "Operations files insert" on storage.objects;
create policy "Operations files insert"
  on storage.objects
  for insert
  with check (
    bucket_id = 'operations-center-files'
    and public.can_access_message_thread(public.storage_thread_id_from_object_name(name))
  );

drop policy if exists "Operations files update" on storage.objects;
create policy "Operations files update"
  on storage.objects
  for update
  using (
    bucket_id = 'operations-center-files'
    and public.can_access_message_thread(public.storage_thread_id_from_object_name(name))
  )
  with check (
    bucket_id = 'operations-center-files'
    and public.can_access_message_thread(public.storage_thread_id_from_object_name(name))
  );

drop policy if exists "Operations files delete" on storage.objects;
create policy "Operations files delete"
  on storage.objects
  for delete
  using (
    bucket_id = 'operations-center-files'
    and (
      public.can_manage_operations_messages()
      or public.can_access_message_thread(public.storage_thread_id_from_object_name(name))
    )
  );
