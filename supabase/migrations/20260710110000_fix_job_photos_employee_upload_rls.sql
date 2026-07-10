-- Fix employee photo upload RLS for tenant resolution fallback.
-- Idempotent migration.

create or replace function public.current_employee_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.tenant_id
  from public.employees as e
  where e.auth_user_id = auth.uid()
    and e.is_active = true
  limit 1;
$$;

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
        and j.tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
    )
  );
