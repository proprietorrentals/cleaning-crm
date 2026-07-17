-- Apply Phase 2A metadata timestamp hardening to already-migrated databases.

create or replace function public.ai_workforce_upsert_generated_content(
  p_employee_slug text,
  p_task_type text,
  p_prompt text,
  p_context jsonb,
  p_content text,
  p_provider text,
  p_model text,
  p_is_mock boolean,
  p_request_id uuid,
  p_title text
)
returns table(
  saved_content_id uuid,
  task_id uuid,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  title text,
  duplicate_prevented boolean
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_employee_id uuid;
  v_employee_name text;
  v_saved_id uuid;
  v_task_id uuid;
  v_saved_inserted boolean := false;
  v_task_inserted boolean := false;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if not public.is_super_admin() then
    raise exception 'Super Admin access required.';
  end if;

  if p_request_id is null then
    raise exception 'request_id is required.';
  end if;

  select e.id, e.name
  into v_employee_id, v_employee_name
  from public.ai_employees as e
  where e.slug = p_employee_slug
    and e.status = 'active'
  limit 1;

  if v_employee_id is null then
    raise exception 'Unknown or inactive AI employee.';
  end if;

  insert into public.ai_saved_content (
    employee_id,
    super_admin_user_id,
    title,
    content_type,
    content,
    metadata,
    status,
    request_id
  )
  values (
    v_employee_id,
    v_user_id,
    p_title,
    p_task_type,
    p_content,
    jsonb_build_object(
      'request_id', p_request_id,
      'prompt', p_prompt,
      'context', coalesce(p_context, '{}'::jsonb),
      'provider', p_provider,
      'model', p_model,
      'is_mock', coalesce(p_is_mock, false),
      'generated_at', now(),
      'employee_slug', p_employee_slug
    ),
    'draft',
    p_request_id
  )
  on conflict (super_admin_user_id, employee_id, request_id)
  where request_id is not null
  do nothing
  returning id into v_saved_id;

  if v_saved_id is not null then
    v_saved_inserted := true;
  else
    select s.id
    into v_saved_id
    from public.ai_saved_content as s
    where s.super_admin_user_id = v_user_id
      and s.employee_id = v_employee_id
      and s.request_id = p_request_id
    limit 1;
  end if;

  if v_saved_id is null then
    raise exception 'Unable to resolve saved content row.';
  end if;

  insert into public.ai_tasks (
    employee_id,
    super_admin_user_id,
    title,
    description,
    task_type,
    status,
    approval_status,
    input_data,
    output_data,
    request_id,
    saved_content_id
  )
  values (
    v_employee_id,
    v_user_id,
    p_title,
    left(p_content, 250),
    p_task_type,
    'draft',
    'draft',
    jsonb_build_object(
      'request_id', p_request_id,
      'prompt', p_prompt,
      'context', coalesce(p_context, '{}'::jsonb),
      'employee_slug', p_employee_slug
    ),
    jsonb_build_object(
      'content_id', v_saved_id,
      'provider', p_provider,
      'model', p_model,
      'is_mock', coalesce(p_is_mock, false),
      'generated_at', now(),
      'history', jsonb_build_array(
        jsonb_build_object(
          'id', gen_random_uuid(),
          'action', 'generated',
          'employee', v_employee_name,
          'employee_slug', p_employee_slug,
          'timestamp', now(),
          'related_content_id', v_saved_id,
          'resulting_status', 'draft',
          'title', p_title
        )
      )
    ),
    p_request_id,
    v_saved_id
  )
  on conflict (super_admin_user_id, employee_id, request_id)
  where request_id is not null
  do nothing
  returning id into v_task_id;

  if v_task_id is not null then
    v_task_inserted := true;
  else
    select t.id
    into v_task_id
    from public.ai_tasks as t
    where t.super_admin_user_id = v_user_id
      and t.employee_id = v_employee_id
      and (
        t.request_id = p_request_id
        or t.saved_content_id = v_saved_id
      )
    order by t.updated_at desc
    limit 1;
  end if;

  if v_task_id is null then
    raise exception 'Unable to resolve linked task row.';
  end if;

  return query
  select
    s.id,
    v_task_id,
    s.status,
    s.created_at,
    s.updated_at,
    s.title,
    not (v_saved_inserted and v_task_inserted)
  from public.ai_saved_content as s
  where s.id = v_saved_id;
end;
$$;

grant execute on function public.ai_workforce_upsert_generated_content(
  text,
  text,
  text,
  jsonb,
  text,
  text,
  text,
  boolean,
  uuid,
  text
) to authenticated;