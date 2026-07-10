-- Reconcile job_photos with the application schema.
-- Canonical field: photo_url.

create table if not exists public.job_photos (
  id          uuid        primary key default gen_random_uuid(),
  job_id      uuid        not null references public.jobs(id) on delete cascade,
  employee_id uuid        not null references public.employees(id) on delete cascade,
  tenant_id   uuid        not null references public.tenants(id) on delete cascade,
  photo_url   text        not null,
  photo_type  text        not null check (photo_type in ('before', 'after', 'signature')),
  notes       text,
  created_at  timestamptz  not null default now()
);

alter table public.job_photos
  add column if not exists photo_url text,
  add column if not exists file_url text,
  add column if not exists photo_type text,
  add column if not exists notes text,
  add column if not exists created_at timestamptz not null default now();

update public.job_photos
set photo_url = coalesce(nullif(photo_url, ''), nullif(file_url, ''))
where photo_url is null or btrim(photo_url) = '';

alter table public.job_photos
  alter column photo_url set not null,
  alter column created_at set default now();

update public.job_photos
set tenant_id = coalesce(tenant_id, '00000000-0000-0000-0000-000000000001'::uuid)
where tenant_id is null;

update public.job_photos as jp
set tenant_id = coalesce(j.tenant_id, '00000000-0000-0000-0000-000000000001'::uuid)
from public.jobs as j
where jp.job_id = j.id
  and jp.tenant_id is null;

alter table public.job_photos
  alter column tenant_id set not null,
  alter column photo_type set not null;

alter table public.job_photos
  drop column if exists file_url;

create index if not exists job_photos_job_id_idx
  on public.job_photos(job_id);

create index if not exists job_photos_employee_id_idx
  on public.job_photos(employee_id);

create index if not exists job_photos_tenant_id_idx
  on public.job_photos(tenant_id);

create index if not exists job_photos_photo_type_idx
  on public.job_photos(photo_type);

create index if not exists job_photos_created_at_idx
  on public.job_photos(created_at desc);

create index if not exists job_photos_job_created_idx
  on public.job_photos(job_id, created_at desc);

alter table public.job_photos enable row level security;

drop policy if exists "Admins manage tenant job photos" on public.job_photos;
create policy "Admins manage tenant job photos"
  on public.job_photos
  for all
  using (
    public.is_admin()
    and tenant_id = public.current_tenant_id()
  )
  with check (
    public.is_admin()
    and tenant_id = public.current_tenant_id()
  );

drop policy if exists "Employees insert assigned job photos" on public.job_photos;
create policy "Employees insert assigned job photos"
  on public.job_photos
  for insert
  with check (
    public.is_active_employee()
    and employee_id = public.current_employee_id()
    and exists (
      select 1
      from public.jobs as j
      where j.id = job_id
        and j.assigned_employee_id = public.current_employee_id()
        and j.tenant_id = public.current_tenant_id()
    )
  );

drop policy if exists "Employees select assigned job photos" on public.job_photos;
create policy "Employees select assigned job photos"
  on public.job_photos
  for select
  using (
    public.is_active_employee()
    and employee_id = public.current_employee_id()
    and exists (
      select 1
      from public.jobs as j
      where j.id = job_id
        and j.assigned_employee_id = public.current_employee_id()
        and j.tenant_id = public.current_tenant_id()
    )
  );

drop policy if exists "Customers view completed own job photos" on public.job_photos;
create policy "Customers view completed own job photos"
  on public.job_photos
  for select
  using (
    exists (
      select 1
      from public.jobs as j
      join public.customers as c
        on c.id = j.customer_id
      where j.id = job_id
        and lower(coalesce(j.status, '')) = 'completed'
        and c.user_id = auth.uid()
        and c.tenant_id = tenant_id
        and j.tenant_id = tenant_id
    )
  );
