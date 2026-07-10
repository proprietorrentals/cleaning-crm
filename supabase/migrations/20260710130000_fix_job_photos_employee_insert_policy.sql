-- Tighten employee INSERT policy for job_photos to validate resolved employee/job/tenant directly.
-- Idempotent migration.

drop policy if exists "Employees insert assigned job photos" on public.job_photos;

create policy "Employees insert assigned job photos"
  on public.job_photos
  for insert
  with check (
    public.is_active_employee()
    and public.job_photos.employee_id = public.current_employee_id()
    and exists (
      select 1
      from public.jobs as j
      where j.id = public.job_photos.job_id
        and j.assigned_employee_id = public.current_employee_id()
        and j.tenant_id = public.job_photos.tenant_id
    )
  );
