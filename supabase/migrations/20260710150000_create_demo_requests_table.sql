-- Public sales/contact intake table for ServiceOS Sprint 1.
-- This migration is isolated to lead capture and does not modify existing portal schemas.

create table if not exists public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null,
  email text not null,
  phone text,
  employee_count text not null,
  business_type text not null,
  message text not null,
  source_page text not null default '/contact',
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.demo_requests enable row level security;
