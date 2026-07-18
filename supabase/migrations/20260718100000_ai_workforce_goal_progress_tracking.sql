-- AI Workforce Phase 2b: goal progress tracking, completion timestamp, and history.

alter table public.ai_weekly_goals
  add column if not exists completed_at timestamptz;

create index if not exists ai_weekly_goals_user_completed_idx
  on public.ai_weekly_goals(super_admin_user_id, completed_at desc)
  where completed_at is not null;

create table if not exists public.ai_goal_progress_updates (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.ai_weekly_goals(id) on delete cascade,
  super_admin_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('not_started', 'in_progress', 'blocked', 'completed')),
  progress_percent integer not null check (progress_percent between 0 and 100),
  work_completed text not null default '',
  blocker_notes text not null default '',
  next_action text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_goal_progress_updates_goal_created_idx
  on public.ai_goal_progress_updates(goal_id, created_at desc);

create index if not exists ai_goal_progress_updates_user_created_idx
  on public.ai_goal_progress_updates(super_admin_user_id, created_at desc);

drop trigger if exists trg_touch_ai_goal_progress_updates_updated_at on public.ai_goal_progress_updates;
create trigger trg_touch_ai_goal_progress_updates_updated_at
before update on public.ai_goal_progress_updates
for each row execute function public.touch_ai_workforce_updated_at();

alter table public.ai_goal_progress_updates enable row level security;

drop policy if exists "Super admins manage ai goal progress updates" on public.ai_goal_progress_updates;
create policy "Super admins manage ai goal progress updates" on public.ai_goal_progress_updates
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

grant select, insert, update, delete on public.ai_goal_progress_updates to authenticated;
