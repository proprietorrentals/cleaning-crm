-- Ensure mileage requests carry tenant context for employee/admin workflows.
-- Idempotent migration.

alter table public.mileage_requests
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

update public.mileage_requests as mr
set tenant_id = j.tenant_id
from public.jobs as j
where mr.tenant_id is null
  and j.id = mr.from_job_id
  and j.tenant_id is not null;

update public.mileage_requests
set tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
where tenant_id is null;

alter table public.mileage_requests
  alter column tenant_id set not null;

create index if not exists mileage_requests_tenant_id_idx
  on public.mileage_requests(tenant_id);

drop trigger if exists trg_set_tenant_id on public.mileage_requests;
create trigger trg_set_tenant_id
  before insert on public.mileage_requests
  for each row execute function public.set_tenant_id();

alter table public.mileage_requests enable row level security;

drop policy if exists "Employees view own mileage requests" on public.mileage_requests;
drop policy if exists "Employees insert own mileage requests" on public.mileage_requests;
drop policy if exists "Employees update own pending mileage requests" on public.mileage_requests;
drop policy if exists "Mileage reviewers manage all requests" on public.mileage_requests;

create policy "Employees view own mileage requests" on public.mileage_requests
  for select
  using (
    employee_id = public.current_employee_id()
    and tenant_id = public.current_tenant_id()
  );

create policy "Employees insert own mileage requests" on public.mileage_requests
  for insert
  with check (
    employee_id = public.current_employee_id()
    and status = 'pending'
    and tenant_id = public.current_tenant_id()
    and exists (
      select 1
      from public.jobs as from_job
      join public.jobs as to_job on to_job.id = public.mileage_requests.to_job_id
      where from_job.id = public.mileage_requests.from_job_id
        and from_job.tenant_id = public.mileage_requests.tenant_id
        and to_job.tenant_id = public.mileage_requests.tenant_id
    )
  );

create policy "Employees update own pending mileage requests" on public.mileage_requests
  for update
  using (
    employee_id = public.current_employee_id()
    and status = 'pending'
    and tenant_id = public.current_tenant_id()
  )
  with check (
    employee_id = public.current_employee_id()
    and status = 'pending'
    and tenant_id = public.current_tenant_id()
  );

create policy "Mileage reviewers manage all requests" on public.mileage_requests
  for all
  using (
    public.can_review_mileage()
    and tenant_id = public.current_tenant_id()
  )
  with check (
    public.can_review_mileage()
    and tenant_id = public.current_tenant_id()
  );
