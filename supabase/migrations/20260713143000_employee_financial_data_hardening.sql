-- Employee financial data hardening
-- Remove direct employee read access to financial job columns and expose
-- an employee-safe jobs view for portal workflows.

create or replace view public.employee_assigned_jobs
with (security_invoker = true)
as
select
  j.id,
  j.tenant_id,
  j.customer_id,
  j.scheduled_date,
  j.scheduled_start_time,
  j.status,
  j.notes,
  j.assigned_employee_id,
  j.assigned_employee,
  j.started_at,
  j.completed_at,
  j.signature_url,
  j.signature_status,
  j.signature_reason,
  j.signature_notes,
  j.attempted_signature_at,
  j.created_at,
  j.updated_at
from public.jobs as j
where j.tenant_id = coalesce(public.current_employee_tenant_id(), public.current_tenant_id())
  and j.assigned_employee_id = public.current_employee_id();

grant select on public.employee_assigned_jobs to authenticated;

-- Remove direct employee job SELECT policy so employees cannot query
-- financial columns (for example estimated_value) from public.jobs.
drop policy if exists "Employees view assigned jobs" on public.jobs;
