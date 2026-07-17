-- AI Workforce Phase 2A atomicity and durability hardening.
-- Adds durable identifiers/relationships and transactional RPCs.

alter table public.ai_saved_content
  add column if not exists request_id uuid;

alter table public.ai_tasks
  add column if not exists request_id uuid,
  add column if not exists saved_content_id uuid references public.ai_saved_content(id) on delete set null;

update public.ai_saved_content
set request_id = (metadata ->> 'request_id')::uuid
where request_id is null
  and metadata ? 'request_id'
  and (metadata ->> 'request_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

update public.ai_tasks
set request_id = (input_data ->> 'request_id')::uuid
where request_id is null
  and input_data ? 'request_id'
  and (input_data ->> 'request_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

update public.ai_tasks as t
set saved_content_id = (t.output_data ->> 'content_id')::uuid
where t.saved_content_id is null
  and t.output_data ? 'content_id'
  and (t.output_data ->> 'content_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.ai_saved_content as s
    where s.id = (t.output_data ->> 'content_id')::uuid
  );

create unique index if not exists ai_saved_content_owner_employee_request_uidx
  on public.ai_saved_content(super_admin_user_id, employee_id, request_id)
  where request_id is not null;

create unique index if not exists ai_tasks_owner_employee_request_uidx
  on public.ai_tasks(super_admin_user_id, employee_id, request_id)
  where request_id is not null;

create unique index if not exists ai_tasks_saved_content_uidx
  on public.ai_tasks(saved_content_id)
  where saved_content_id is not null;

create index if not exists ai_saved_content_request_id_idx
  on public.ai_saved_content(request_id)
  where request_id is not null;

create index if not exists ai_tasks_request_id_idx
  on public.ai_tasks(request_id)
  where request_id is not null;

create or replace function public.ai_workforce_action_for_status(p_status text)
returns text
language plpgsql
immutable
set search_path = public
as $$
begin
  if p_status = 'draft' then
    return 'saved_as_draft';
  elsif p_status = 'awaiting_approval' then
    return 'submitted_for_approval';
  elsif p_status = 'approved' then
    return 'approved';
  elsif p_status = 'rejected' then
    return 'rejected';
  elsif p_status = 'completed' then
    return 'completed';
  end if;

  raise exception 'Unsupported AI Workforce status: %', p_status;
end;
$$;

do $$
begin
  if public.ai_workforce_action_for_status('draft') <> 'saved_as_draft' then
    raise exception 'Status mapping verification failed for draft';
  end if;

  if public.ai_workforce_action_for_status('awaiting_approval') <> 'submitted_for_approval' then
    raise exception 'Status mapping verification failed for awaiting_approval';
  end if;

  if public.ai_workforce_action_for_status('approved') <> 'approved' then
    raise exception 'Status mapping verification failed for approved';
  end if;

  if public.ai_workforce_action_for_status('rejected') <> 'rejected' then
    raise exception 'Status mapping verification failed for rejected';
  end if;

  if public.ai_workforce_action_for_status('completed') <> 'completed' then
    raise exception 'Status mapping verification failed for completed';
  end if;

  begin
    perform public.ai_workforce_action_for_status('unknown_status');
    raise exception 'Status mapping verification failed: unknown status should fail';
  exception
    when others then
      null;
  end;
end;
$$;

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

create or replace function public.ai_workforce_transition_status(
  p_content_id uuid,
  p_employee_slug text,
  p_target_status text
)
returns table(
  content_id uuid,
  task_id uuid,
  status text,
  approved_at timestamptz,
  completed_at timestamptz,
  duplicate_prevented boolean,
  history_length integer,
  action text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_employee_id uuid;
  v_employee_name text;
  v_content public.ai_saved_content%rowtype;
  v_task public.ai_tasks%rowtype;
  v_task_count integer;
  v_action text;
  v_history jsonb;
  v_last jsonb;
  v_now timestamptz;
  v_approved_at timestamptz;
  v_completed_at timestamptz;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if not public.is_super_admin() then
    raise exception 'Super Admin access required.';
  end if;

  v_action := public.ai_workforce_action_for_status(p_target_status);

  select e.id, e.name
  into v_employee_id, v_employee_name
  from public.ai_employees as e
  where e.slug = p_employee_slug
  limit 1;

  if v_employee_id is null then
    raise exception 'Unknown AI employee.';
  end if;

  select *
  into v_content
  from public.ai_saved_content as s
  where s.id = p_content_id
    and s.employee_id = v_employee_id
    and s.super_admin_user_id = v_user_id
  for update;

  if v_content.id is null then
    raise exception 'Saved content not found.';
  end if;

  select count(*)
  into v_task_count
  from public.ai_tasks as t
  where t.saved_content_id = v_content.id
    and t.employee_id = v_employee_id
    and t.super_admin_user_id = v_user_id;

  if v_task_count <> 1 then
    raise exception 'Linked task integrity failure. Expected exactly one task, found %.', v_task_count;
  end if;

  select *
  into v_task
  from public.ai_tasks as t
  where t.saved_content_id = v_content.id
    and t.employee_id = v_employee_id
    and t.super_admin_user_id = v_user_id
  limit 1
  for update;

  if v_content.status = p_target_status and v_task.approval_status = p_target_status then
    return query
    select
      v_content.id,
      v_task.id,
      v_content.status,
      v_task.approved_at,
      v_task.completed_at,
      true,
      case
        when jsonb_typeof(v_task.output_data -> 'history') = 'array'
          then jsonb_array_length(v_task.output_data -> 'history')
        else 0
      end,
      v_action;
    return;
  end if;

  if jsonb_typeof(v_task.output_data -> 'history') = 'array' then
    v_history := v_task.output_data -> 'history';
  else
    v_history := '[]'::jsonb;
  end if;

  if jsonb_array_length(v_history) > 0 then
    v_last := v_history -> (jsonb_array_length(v_history) - 1);
  else
    v_last := null;
  end if;

  if v_last is null
    or coalesce(v_last ->> 'action', '') <> v_action
    or coalesce(v_last ->> 'resulting_status', '') <> p_target_status
  then
    v_history := v_history || jsonb_build_array(
      jsonb_build_object(
        'id', gen_random_uuid(),
        'action', v_action,
        'employee', v_employee_name,
        'employee_slug', p_employee_slug,
        'timestamp', now(),
        'related_content_id', v_content.id,
        'related_task_id', v_task.id,
        'resulting_status', p_target_status,
        'title', v_content.title
      )
    );
  end if;

  v_now := now();
  v_approved_at := case when p_target_status = 'approved' then v_now else null end;
  v_completed_at := case when p_target_status = 'completed' then v_now else null end;

  update public.ai_saved_content
  set status = p_target_status
  where id = v_content.id;

  update public.ai_tasks
  set status = p_target_status,
      approval_status = p_target_status,
      approved_at = v_approved_at,
      completed_at = v_completed_at,
      output_data = jsonb_set(coalesce(output_data, '{}'::jsonb), '{history}', v_history, true)
  where id = v_task.id;

  return query
  select
    v_content.id,
    v_task.id,
    p_target_status,
    v_approved_at,
    v_completed_at,
    false,
    jsonb_array_length(v_history),
    v_action;
end;
$$;

grant execute on function public.ai_workforce_action_for_status(text) to authenticated;
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
grant execute on function public.ai_workforce_transition_status(uuid, text, text) to authenticated;