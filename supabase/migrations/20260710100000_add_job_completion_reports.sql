-- Add job completion report metadata and storage policies.
-- Idempotent migration.

alter table public.jobs
  add column if not exists report_url text,
  add column if not exists report_generated_at timestamptz,
  add column if not exists report_generated_by uuid references auth.users(id) on delete set null,
  add column if not exists report_ai_summary text;

create index if not exists jobs_report_generated_at_idx
  on public.jobs(report_generated_at desc);

create index if not exists jobs_report_generated_by_idx
  on public.jobs(report_generated_by);

insert into storage.buckets (id, name, public)
values ('job-reports', 'job-reports', true)
on conflict (id) do nothing;

create or replace function public.storage_report_job_id_from_object_name(object_name text)
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

drop policy if exists "Admins manage tenant job reports" on storage.objects;
create policy "Admins manage tenant job reports"
  on storage.objects
  for all
  using (
    bucket_id = 'job-reports'
    and public.is_admin()
    and exists (
      select 1
      from public.jobs as j
      where j.id = public.storage_report_job_id_from_object_name(name)
        and j.tenant_id = public.current_tenant_id()
    )
  )
  with check (
    bucket_id = 'job-reports'
    and public.is_admin()
    and exists (
      select 1
      from public.jobs as j
      where j.id = public.storage_report_job_id_from_object_name(name)
        and j.tenant_id = public.current_tenant_id()
    )
  );

drop policy if exists "Customers view completed own job reports" on storage.objects;
create policy "Customers view completed own job reports"
  on storage.objects
  for select
  using (
    bucket_id = 'job-reports'
    and exists (
      select 1
      from public.jobs as j
      join public.customers as c on c.id = j.customer_id
      where j.id = public.storage_report_job_id_from_object_name(name)
        and lower(coalesce(j.status, '')) = 'completed'
        and c.user_id = auth.uid()
        and c.tenant_id = public.current_tenant_id()
        and j.tenant_id = public.current_tenant_id()
    )
  );
