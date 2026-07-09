-- Ensure required storage bucket exists and enforce scoped access policies.
-- before photos, after photos, and signatures all use the `job-photos` bucket.

insert into storage.buckets (id, name, public)
values ('job-photos', 'job-photos', true)
on conflict (id) do nothing;

create or replace function public.storage_job_id_from_object_name(object_name text)
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

-- Remove older broad policies.
drop policy if exists "Authenticated users upload job photos" on storage.objects;
drop policy if exists "Authenticated users update job photos" on storage.objects;
drop policy if exists "Public read job photos" on storage.objects;

-- Recreate scoped policies idempotently.
drop policy if exists "Admins manage tenant job files" on storage.objects;
create policy "Admins manage tenant job files"
  on storage.objects
  for all
  using (
    bucket_id = 'job-photos'
    and public.is_admin()
    and exists (
      select 1
      from public.jobs as j
      where j.id = public.storage_job_id_from_object_name(name)
        and j.tenant_id = public.current_tenant_id()
    )
  )
  with check (
    bucket_id = 'job-photos'
    and public.is_admin()
    and exists (
      select 1
      from public.jobs as j
      where j.id = public.storage_job_id_from_object_name(name)
        and j.tenant_id = public.current_tenant_id()
    )
  );

drop policy if exists "Employees upload assigned job files" on storage.objects;
create policy "Employees upload assigned job files"
  on storage.objects
  for insert
  with check (
    bucket_id = 'job-photos'
    and public.is_active_employee()
    and exists (
      select 1
      from public.jobs as j
      where j.id = public.storage_job_id_from_object_name(name)
        and j.assigned_employee_id = public.current_employee_id()
        and j.tenant_id = public.current_tenant_id()
    )
  );

drop policy if exists "Employees update assigned job files" on storage.objects;
create policy "Employees update assigned job files"
  on storage.objects
  for update
  using (
    bucket_id = 'job-photos'
    and public.is_active_employee()
    and exists (
      select 1
      from public.jobs as j
      where j.id = public.storage_job_id_from_object_name(name)
        and j.assigned_employee_id = public.current_employee_id()
        and j.tenant_id = public.current_tenant_id()
    )
  )
  with check (
    bucket_id = 'job-photos'
    and public.is_active_employee()
    and exists (
      select 1
      from public.jobs as j
      where j.id = public.storage_job_id_from_object_name(name)
        and j.assigned_employee_id = public.current_employee_id()
        and j.tenant_id = public.current_tenant_id()
    )
  );

drop policy if exists "Employees view assigned job files" on storage.objects;
create policy "Employees view assigned job files"
  on storage.objects
  for select
  using (
    bucket_id = 'job-photos'
    and public.is_active_employee()
    and exists (
      select 1
      from public.jobs as j
      where j.id = public.storage_job_id_from_object_name(name)
        and j.assigned_employee_id = public.current_employee_id()
        and j.tenant_id = public.current_tenant_id()
    )
  );

drop policy if exists "Customers view completed own job files" on storage.objects;
create policy "Customers view completed own job files"
  on storage.objects
  for select
  using (
    bucket_id = 'job-photos'
    and exists (
      select 1
      from public.jobs as j
      join public.customers as c on c.id = j.customer_id
      where j.id = public.storage_job_id_from_object_name(name)
        and lower(coalesce(j.status, '')) = 'completed'
        and c.user_id = auth.uid()
        and c.tenant_id = public.current_tenant_id()
        and j.tenant_id = public.current_tenant_id()
    )
  );