-- ServiceOS Analytics Phase 1: first-party platform events.

create table if not exists public.platform_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  event_source text not null default 'web',
  page_path text,
  metadata jsonb not null default '{}'::jsonb,
  anonymous_id text,
  user_id uuid,
  user_agent text,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'platform_events_event_name_check'
  ) then
    alter table public.platform_events
      add constraint platform_events_event_name_check
      check (
        event_name in (
          'homepage_viewed',
          'pricing_viewed',
          'contact_form_submitted',
          'demo_request_submitted',
          'founding_partner_application_submitted',
          'free_trial_clicked',
          'interactive_demo_opened',
          'demo_video_opened',
          'book_demo_clicked',
          'lead_marked_won'
        )
      );
  end if;
end $$;

create index if not exists platform_events_created_at_idx on public.platform_events (created_at desc);
create index if not exists platform_events_event_name_idx on public.platform_events (event_name);
create index if not exists platform_events_page_path_idx on public.platform_events (page_path);
create index if not exists platform_events_anonymous_id_idx on public.platform_events (anonymous_id);

alter table public.platform_events enable row level security;

drop policy if exists platform_events_super_admin_read on public.platform_events;
create policy platform_events_super_admin_read
  on public.platform_events
  for select
  to authenticated
  using (public.is_super_admin());

revoke all on table public.platform_events from anon;
grant select on table public.platform_events to authenticated;
