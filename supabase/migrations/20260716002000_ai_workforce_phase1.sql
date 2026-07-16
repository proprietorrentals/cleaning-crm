-- ServiceOS AI Workforce Phase 1
-- Internal Super Admin AI employee workspace foundation.

create table if not exists public.ai_employees (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  role text not null,
  mission text not null,
  status text not null default 'active' check (status in ('active', 'coming_soon')),
  system_prompt text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.ai_employees(id) on delete restrict,
  super_admin_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_tasks (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.ai_employees(id) on delete restrict,
  super_admin_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  task_type text not null,
  status text not null default 'draft' check (status in ('draft', 'awaiting_approval', 'approved', 'rejected', 'completed')),
  input_data jsonb not null default '{}'::jsonb,
  output_data jsonb not null default '{}'::jsonb,
  approval_status text not null default 'draft' check (approval_status in ('draft', 'awaiting_approval', 'approved', 'rejected', 'completed')),
  approved_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_saved_content (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.ai_employees(id) on delete restrict,
  super_admin_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content_type text not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'awaiting_approval', 'approved', 'rejected', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_employees_slug_idx
  on public.ai_employees(slug);

create index if not exists ai_conversations_employee_created_idx
  on public.ai_conversations(employee_id, created_at desc);

create index if not exists ai_conversations_super_admin_created_idx
  on public.ai_conversations(super_admin_user_id, created_at desc);

create index if not exists ai_messages_conversation_created_idx
  on public.ai_messages(conversation_id, created_at asc);

create index if not exists ai_tasks_employee_status_idx
  on public.ai_tasks(employee_id, status, created_at desc);

create index if not exists ai_tasks_super_admin_status_idx
  on public.ai_tasks(super_admin_user_id, approval_status, created_at desc);

create index if not exists ai_saved_content_employee_status_idx
  on public.ai_saved_content(employee_id, status, created_at desc);

create index if not exists ai_saved_content_super_admin_created_idx
  on public.ai_saved_content(super_admin_user_id, created_at desc);

create or replace function public.touch_ai_workforce_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();

  if tg_table_name = 'ai_tasks' then
    if new.approval_status = 'approved' and old.approval_status is distinct from 'approved' and new.approved_at is null then
      new.approved_at := now();
    end if;

    if new.status = 'completed' and old.status is distinct from 'completed' and new.completed_at is null then
      new.completed_at := now();
    elsif new.status <> 'completed' and old.status = 'completed' then
      new.completed_at := null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_touch_ai_employees_updated_at on public.ai_employees;
create trigger trg_touch_ai_employees_updated_at
before update on public.ai_employees
for each row execute function public.touch_ai_workforce_updated_at();

drop trigger if exists trg_touch_ai_conversations_updated_at on public.ai_conversations;
create trigger trg_touch_ai_conversations_updated_at
before update on public.ai_conversations
for each row execute function public.touch_ai_workforce_updated_at();

drop trigger if exists trg_touch_ai_tasks_updated_at on public.ai_tasks;
create trigger trg_touch_ai_tasks_updated_at
before update on public.ai_tasks
for each row execute function public.touch_ai_workforce_updated_at();

drop trigger if exists trg_touch_ai_saved_content_updated_at on public.ai_saved_content;
create trigger trg_touch_ai_saved_content_updated_at
before update on public.ai_saved_content
for each row execute function public.touch_ai_workforce_updated_at();

alter table public.ai_employees enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_tasks enable row level security;
alter table public.ai_saved_content enable row level security;

drop policy if exists "Super admins manage ai employees" on public.ai_employees;
create policy "Super admins manage ai employees" on public.ai_employees
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Super admins manage ai conversations" on public.ai_conversations;
create policy "Super admins manage ai conversations" on public.ai_conversations
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Super admins manage ai messages" on public.ai_messages;
create policy "Super admins manage ai messages" on public.ai_messages
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Super admins manage ai tasks" on public.ai_tasks;
create policy "Super admins manage ai tasks" on public.ai_tasks
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Super admins manage ai saved content" on public.ai_saved_content;
create policy "Super admins manage ai saved content" on public.ai_saved_content
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

grant select, insert, update, delete on public.ai_employees to authenticated;
grant select, insert, update, delete on public.ai_conversations to authenticated;
grant select, insert, update, delete on public.ai_messages to authenticated;
grant select, insert, update, delete on public.ai_tasks to authenticated;
grant select, insert, update, delete on public.ai_saved_content to authenticated;

insert into public.ai_employees (slug, name, role, mission, status, system_prompt)
values
  (
    'sales-manager',
    'Sales Manager',
    'Revenue Growth and Outbound Strategy',
    'Help Service OS acquire cleaning-business customers through high-quality, personalized outreach.',
    'active',
    'You are the Service OS Sales Manager AI employee. Your job is helping Service OS acquire cleaning-business customers. Produce personalized sales outreach, qualify prospects, create follow-ups, handle objections, prepare proposals, and recommend next steps. Never invent prospect facts. Clearly label assumptions. Never claim an email was sent. Never claim a call was made. Never claim a prospect was verified unless verified data was supplied. All outputs are drafts and require human review and approval before use.'
  ),
  (
    'marketing-manager',
    'Marketing Manager',
    'Demand Generation and Brand Positioning',
    'Grow awareness and inbound demand for Service OS with trustworthy, conversion-focused content.',
    'active',
    'You are the Service OS Marketing Manager AI employee. Your job is growing awareness and inbound leads for Service OS. Create social media content, SEO content, campaign plans, newsletters, and scripts. Maintain consistent Service OS positioning. Avoid false claims, fake testimonials, invented results, or unsupported statistics. All outputs require review before publication. Never claim content was posted. All outputs are drafts and require human review and approval before use.'
  ),
  (
    'lead-researcher',
    'Lead Researcher',
    'Prospect Intelligence',
    'Support sales and marketing with verified research-ready lead intelligence.',
    'coming_soon',
    'Coming soon in Phase 2.'
  ),
  (
    'customer-success-manager',
    'Customer Success Manager',
    'Retention and Expansion',
    'Increase customer retention and expansion readiness with proactive lifecycle guidance.',
    'coming_soon',
    'Coming soon in Phase 2.'
  ),
  (
    'operations-manager',
    'Operations Manager',
    'Delivery Optimization',
    'Improve operational consistency and execution quality across teams.',
    'coming_soon',
    'Coming soon in Phase 2.'
  ),
  (
    'voice-representative',
    'Voice Representative',
    'Call Support',
    'Prepare compliant voice scripts and call-flow drafts for human representatives.',
    'coming_soon',
    'Coming soon in Phase 2.'
  )
on conflict (slug) do update
set
  name = excluded.name,
  role = excluded.role,
  mission = excluded.mission,
  status = excluded.status,
  system_prompt = case
    when coalesce(nullif(btrim(public.ai_employees.system_prompt), ''), '') = '' then excluded.system_prompt
    else public.ai_employees.system_prompt
  end,
  updated_at = now();
