-- Fix employee job_photos INSERT policy to validate explicit tenant_id, employee_id, and assigned job.
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

drop policy if exists "Employees insert assigned job photos" on public.job_photos;
create policy "Employees insert assigned job photos"
  on public.job_photos
  for insert
  with check (
    public.is_active_employee()
    and public.job_photos.employee_id = public.current_employee_id()
    and public.job_photos.tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
    and exists (
      select 1
      from public.jobs as j
      where j.id = public.job_photos.job_id
        and j.assigned_employee_id = public.current_employee_id()
        and j.tenant_id = public.job_photos.tenant_id
    )
  );
