-- Ensure new jobs always resolve tenant_id using explicit precedence.
-- Order: customer tenant -> creating employee tenant -> current_tenant_id().

create or replace function public.set_jobs_tenant_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_tenant_id uuid;
  v_creator_employee_tenant_id uuid;
begin
  if new.tenant_id is null then
    if new.customer_id is not null then
      select c.tenant_id
      into v_customer_tenant_id
      from public.customers as c
      where c.id = new.customer_id;

      new.tenant_id := v_customer_tenant_id;
    end if;

    if new.tenant_id is null then
      select e.tenant_id
      into v_creator_employee_tenant_id
      from public.employees as e
      where e.auth_user_id = auth.uid()
        and e.is_active = true
      limit 1;

      new.tenant_id := v_creator_employee_tenant_id;
    end if;

    if new.tenant_id is null then
      new.tenant_id := public.current_tenant_id();
    end if;
  end if;

  if new.tenant_id is null then
    raise exception 'jobs.tenant_id is required and could not be resolved from customer, employee, or current tenant context';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_tenant_id on public.jobs;
create trigger trg_set_tenant_id
  before insert on public.jobs
  for each row execute function public.set_jobs_tenant_id();
