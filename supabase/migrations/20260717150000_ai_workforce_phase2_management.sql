-- AI Workforce Phase 2 management: goals, assignments, recurring tasks, handoffs, weekly summaries.

create table if not exists public.ai_weekly_goals (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.ai_employees(id) on delete restrict,
  super_admin_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  week_start_date date not null,
  due_date date not null,
  priority text not null check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null check (status in ('not_started', 'in_progress', 'blocked', 'completed')),
  success_metric text not null default '',
  notes text not null default '',
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_recurring_tasks (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.ai_employees(id) on delete cascade,
  super_admin_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  instructions text not null default '',
  priority text not null check (priority in ('low', 'medium', 'high', 'urgent')),
  approval_required boolean not null default true,
  day_of_week smallint not null default 1 check (day_of_week between 0 and 6),
  is_active boolean not null default true,
  checklist_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (super_admin_user_id, employee_id, title)
);

create table if not exists public.ai_assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.ai_employees(id) on delete restrict,
  super_admin_user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references public.ai_weekly_goals(id) on delete set null,
  recurring_task_id uuid references public.ai_recurring_tasks(id) on delete set null,
  title text not null,
  instructions text not null default '',
  due_date date not null,
  week_start_date date,
  priority text not null check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null check (status in ('assigned', 'in_progress', 'awaiting_approval', 'approved', 'rejected', 'completed', 'blocked')),
  approval_required boolean not null default true,
  is_recurring boolean not null default false,
  is_one_time boolean not null default true,
  rejection_feedback text,
  blocked_reason text,
  assigned_at timestamptz not null default now(),
  started_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_handoffs (
  id uuid primary key default gen_random_uuid(),
  super_admin_user_id uuid not null references auth.users(id) on delete cascade,
  from_employee_id uuid not null references public.ai_employees(id) on delete restrict,
  to_employee_id uuid not null references public.ai_employees(id) on delete restrict,
  assignment_id uuid references public.ai_assignments(id) on delete set null,
  summary text not null,
  attached_saved_content_id uuid references public.ai_saved_content(id) on delete set null,
  requested_next_action text not null default '',
  status text not null check (status in ('pending', 'accepted', 'in_progress', 'completed')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_weekly_summaries (
  id uuid primary key default gen_random_uuid(),
  super_admin_user_id uuid not null references auth.users(id) on delete cascade,
  week_start_date date not null,
  week_end_date date not null,
  summary_markdown text not null,
  generated_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (super_admin_user_id, week_start_date, week_end_date)
);

create index if not exists ai_weekly_goals_user_due_idx
  on public.ai_weekly_goals(super_admin_user_id, due_date, status);

create index if not exists ai_weekly_goals_employee_week_idx
  on public.ai_weekly_goals(employee_id, week_start_date desc);

create index if not exists ai_assignments_user_due_idx
  on public.ai_assignments(super_admin_user_id, due_date, status);

create index if not exists ai_assignments_employee_status_idx
  on public.ai_assignments(employee_id, status, due_date);

create unique index if not exists ai_assignments_recurring_week_uidx
  on public.ai_assignments(recurring_task_id, week_start_date)
  where recurring_task_id is not null and week_start_date is not null;

create index if not exists ai_handoffs_user_status_idx
  on public.ai_handoffs(super_admin_user_id, status, created_at desc);

create index if not exists ai_weekly_summaries_user_week_idx
  on public.ai_weekly_summaries(super_admin_user_id, week_start_date desc);

drop trigger if exists trg_touch_ai_weekly_goals_updated_at on public.ai_weekly_goals;
create trigger trg_touch_ai_weekly_goals_updated_at
before update on public.ai_weekly_goals
for each row execute function public.touch_ai_workforce_updated_at();

drop trigger if exists trg_touch_ai_recurring_tasks_updated_at on public.ai_recurring_tasks;
create trigger trg_touch_ai_recurring_tasks_updated_at
before update on public.ai_recurring_tasks
for each row execute function public.touch_ai_workforce_updated_at();

drop trigger if exists trg_touch_ai_assignments_updated_at on public.ai_assignments;
create trigger trg_touch_ai_assignments_updated_at
before update on public.ai_assignments
for each row execute function public.touch_ai_workforce_updated_at();

drop trigger if exists trg_touch_ai_handoffs_updated_at on public.ai_handoffs;
create trigger trg_touch_ai_handoffs_updated_at
before update on public.ai_handoffs
for each row execute function public.touch_ai_workforce_updated_at();

drop trigger if exists trg_touch_ai_weekly_summaries_updated_at on public.ai_weekly_summaries;
create trigger trg_touch_ai_weekly_summaries_updated_at
before update on public.ai_weekly_summaries
for each row execute function public.touch_ai_workforce_updated_at();

alter table public.ai_weekly_goals enable row level security;
alter table public.ai_recurring_tasks enable row level security;
alter table public.ai_assignments enable row level security;
alter table public.ai_handoffs enable row level security;
alter table public.ai_weekly_summaries enable row level security;

drop policy if exists "Super admins manage ai weekly goals" on public.ai_weekly_goals;
create policy "Super admins manage ai weekly goals" on public.ai_weekly_goals
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Super admins manage ai recurring tasks" on public.ai_recurring_tasks;
create policy "Super admins manage ai recurring tasks" on public.ai_recurring_tasks
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Super admins manage ai assignments" on public.ai_assignments;
create policy "Super admins manage ai assignments" on public.ai_assignments
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Super admins manage ai handoffs" on public.ai_handoffs;
create policy "Super admins manage ai handoffs" on public.ai_handoffs
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Super admins manage ai weekly summaries" on public.ai_weekly_summaries;
create policy "Super admins manage ai weekly summaries" on public.ai_weekly_summaries
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

grant select, insert, update, delete on public.ai_weekly_goals to authenticated;
grant select, insert, update, delete on public.ai_recurring_tasks to authenticated;
grant select, insert, update, delete on public.ai_assignments to authenticated;
grant select, insert, update, delete on public.ai_handoffs to authenticated;
grant select, insert, update, delete on public.ai_weekly_summaries to authenticated;
