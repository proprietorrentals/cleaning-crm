-- Additive audit + repair for claim_marketplace_lead RPC dependencies.
-- This migration only adds/repairs schema objects referenced by the RPC.

do $$
begin
  if to_regclass('public.marketplace_leads') is null then
    raise exception 'Missing required table: public.marketplace_leads';
  end if;
  if to_regclass('public.customers') is null then
    raise exception 'Missing required table: public.customers';
  end if;
  if to_regclass('public.sales_leads') is null then
    raise exception 'Missing required table: public.sales_leads';
  end if;
  if to_regclass('public.ai_employees') is null then
    raise exception 'Missing required table: public.ai_employees';
  end if;
  if to_regclass('public.ai_assignments') is null then
    raise exception 'Missing required table: public.ai_assignments';
  end if;
  if to_regclass('public.marketplace_lead_audit_history') is null then
    raise exception 'Missing required table: public.marketplace_lead_audit_history';
  end if;
  if to_regclass('public.platform_events') is null then
    raise exception 'Missing required table: public.platform_events';
  end if;
end $$;

alter table public.marketplace_leads
  add column if not exists lead_id uuid,
  add column if not exists business_name text,
  add column if not exists contact_name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists property_type text,
  add column if not exists service_requested text,
  add column if not exists notes text,
  add column if not exists status text,
  add column if not exists qualification_status text,
  add column if not exists claimed_at timestamptz,
  add column if not exists claimed_by_user_id uuid,
  add column if not exists claimed_by_user_email text,
  add column if not exists claimed_company_id uuid,
  add column if not exists claimed_sales_lead_id uuid;

alter table public.customers
  add column if not exists id uuid,
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade,
  add column if not exists company_name text,
  add column if not exists contact_name text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists address text,
  add column if not exists notes text,
  add column if not exists created_at timestamptz default now();

alter table public.sales_leads
  add column if not exists id uuid,
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade,
  add column if not exists contact_name text,
  add column if not exists company_name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists employee_count text,
  add column if not exists business_type text,
  add column if not exists current_software text,
  add column if not exists message text,
  add column if not exists source text,
  add column if not exists status text,
  add column if not exists founding_partner_interest boolean,
  add column if not exists internal_notes text,
  add column if not exists origin_marketplace_lead_id uuid references public.marketplace_leads(lead_id) on delete set null,
  add column if not exists converted_customer_id uuid references public.customers(id) on delete set null,
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.ai_employees
  add column if not exists id uuid,
  add column if not exists slug text;

alter table public.ai_assignments
  add column if not exists employee_id uuid references public.ai_employees(id) on delete restrict,
  add column if not exists super_admin_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists title text,
  add column if not exists instructions text,
  add column if not exists due_date date,
  add column if not exists priority text,
  add column if not exists status text,
  add column if not exists approval_required boolean,
  add column if not exists is_recurring boolean,
  add column if not exists is_one_time boolean;

alter table public.marketplace_lead_audit_history
  add column if not exists lead_id uuid,
  add column if not exists changed_by uuid,
  add column if not exists action text,
  add column if not exists change_summary text,
  add column if not exists before_data jsonb,
  add column if not exists after_data jsonb,
  add column if not exists metadata jsonb;

alter table public.platform_events
  add column if not exists event_name text,
  add column if not exists event_source text,
  add column if not exists page_path text,
  add column if not exists metadata jsonb,
  add column if not exists user_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'marketplace_leads_claimed_by_user_id_fkey'
  ) then
    alter table public.marketplace_leads
      add constraint marketplace_leads_claimed_by_user_id_fkey
      foreign key (claimed_by_user_id)
      references auth.users(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'marketplace_leads_claimed_company_id_fkey'
  ) then
    alter table public.marketplace_leads
      add constraint marketplace_leads_claimed_company_id_fkey
      foreign key (claimed_company_id)
      references public.customers(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'marketplace_leads_claimed_sales_lead_id_fkey'
  ) then
    alter table public.marketplace_leads
      add constraint marketplace_leads_claimed_sales_lead_id_fkey
      foreign key (claimed_sales_lead_id)
      references public.sales_leads(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sales_leads_origin_marketplace_lead_id_fkey'
  ) then
    alter table public.sales_leads
      add constraint sales_leads_origin_marketplace_lead_id_fkey
      foreign key (origin_marketplace_lead_id)
      references public.marketplace_leads(lead_id)
      on delete set null;
  end if;
end $$;

create index if not exists marketplace_leads_claimed_at_idx
  on public.marketplace_leads(claimed_at desc);

create index if not exists marketplace_leads_claimed_by_user_id_idx
  on public.marketplace_leads(claimed_by_user_id);

create index if not exists marketplace_leads_claimed_by_user_email_idx
  on public.marketplace_leads(claimed_by_user_email);

create index if not exists marketplace_leads_claimed_company_id_idx
  on public.marketplace_leads(claimed_company_id);

create index if not exists sales_leads_origin_marketplace_lead_uidx
  on public.sales_leads(origin_marketplace_lead_id)
  where origin_marketplace_lead_id is not null;

create index if not exists customers_tenant_id_idx
  on public.customers(tenant_id);

create index if not exists ai_employees_slug_idx
  on public.ai_employees(slug);

do $$
declare
  constraint_name text;
  constraint_def text;
  allowed_values text[];
  v text;
  normalized_values text[];
  value_sql text;
begin
  -- marketplace_leads.status must accept Claimed
  select c.conname, pg_get_constraintdef(c.oid)
  into constraint_name, constraint_def
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'marketplace_leads'
    and c.conname = 'marketplace_leads_status_check'
  limit 1;

  if constraint_name is null then
    alter table public.marketplace_leads
      add constraint marketplace_leads_status_check
      check (status in ('new', 'reviewing', 'qualified', 'contacted', 'Claimed', 'closed_won', 'closed_lost'));
  elsif position('''Claimed''' in constraint_def) = 0 then
    select coalesce(array_agg(m[1]), array[]::text[])
    into allowed_values
    from regexp_matches(constraint_def, '''([^'']+)''', 'g') as m;

    normalized_values := array[]::text[];
    foreach v in array allowed_values
    loop
      if v is not null and not (v = any(normalized_values)) then
        normalized_values := array_append(normalized_values, v);
      end if;
    end loop;
    normalized_values := array_append(normalized_values, 'Claimed');

    select string_agg(quote_literal(x), ', ' order by x)
    into value_sql
    from unnest(normalized_values) as x;

    execute format('alter table public.marketplace_leads drop constraint %I', constraint_name);
    execute format(
      'alter table public.marketplace_leads add constraint marketplace_leads_status_check check (status in (%s))',
      value_sql
    );
  end if;

  -- marketplace_leads.qualification_status must accept Verified
  select c.conname, pg_get_constraintdef(c.oid)
  into constraint_name, constraint_def
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'marketplace_leads'
    and c.conname = 'marketplace_leads_qualification_status_check'
  limit 1;

  if constraint_name is null then
    alter table public.marketplace_leads
      add constraint marketplace_leads_qualification_status_check
      check (qualification_status in ('New', 'Needs Review', 'Verified', 'Rejected'));
  elsif position('''Verified''' in constraint_def) = 0 then
    select coalesce(array_agg(m[1]), array[]::text[])
    into allowed_values
    from regexp_matches(constraint_def, '''([^'']+)''', 'g') as m;

    normalized_values := array[]::text[];
    foreach v in array allowed_values
    loop
      if v is not null and not (v = any(normalized_values)) then
        normalized_values := array_append(normalized_values, v);
      end if;
    end loop;
    normalized_values := array_append(normalized_values, 'Verified');

    select string_agg(quote_literal(x), ', ' order by x)
    into value_sql
    from unnest(normalized_values) as x;

    execute format('alter table public.marketplace_leads drop constraint %I', constraint_name);
    execute format(
      'alter table public.marketplace_leads add constraint marketplace_leads_qualification_status_check check (qualification_status in (%s))',
      value_sql
    );
  end if;

  -- sales_leads.source must accept lead_marketplace
  select c.conname, pg_get_constraintdef(c.oid)
  into constraint_name, constraint_def
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'sales_leads'
    and c.conname = 'sales_leads_source_check'
  limit 1;

  if constraint_name is null then
    alter table public.sales_leads
      add constraint sales_leads_source_check
      check (source in ('website', 'website_contact', 'demo_request', 'founding_partner', 'free_trial', 'lead_marketplace'));
  elsif position('''lead_marketplace''' in constraint_def) = 0 then
    select coalesce(array_agg(m[1]), array[]::text[])
    into allowed_values
    from regexp_matches(constraint_def, '''([^'']+)''', 'g') as m;

    normalized_values := array[]::text[];
    foreach v in array allowed_values
    loop
      if v is not null and not (v = any(normalized_values)) then
        normalized_values := array_append(normalized_values, v);
      end if;
    end loop;
    normalized_values := array_append(normalized_values, 'lead_marketplace');

    select string_agg(quote_literal(x), ', ' order by x)
    into value_sql
    from unnest(normalized_values) as x;

    execute format('alter table public.sales_leads drop constraint %I', constraint_name);
    execute format(
      'alter table public.sales_leads add constraint sales_leads_source_check check (source in (%s))',
      value_sql
    );
  end if;

  -- sales_leads.status must accept new/contacted
  select c.conname, pg_get_constraintdef(c.oid)
  into constraint_name, constraint_def
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'sales_leads'
    and c.conname = 'sales_leads_status_check'
  limit 1;

  if constraint_name is null then
    alter table public.sales_leads
      add constraint sales_leads_status_check
      check (status in ('new', 'contacted', 'demo_scheduled', 'proposal_sent', 'won', 'lost'));
  elsif position('''new''' in constraint_def) = 0 or position('''contacted''' in constraint_def) = 0 then
    select coalesce(array_agg(m[1]), array[]::text[])
    into allowed_values
    from regexp_matches(constraint_def, '''([^'']+)''', 'g') as m;

    normalized_values := array[]::text[];
    foreach v in array allowed_values
    loop
      if v is not null and not (v = any(normalized_values)) then
        normalized_values := array_append(normalized_values, v);
      end if;
    end loop;
    if not ('new' = any(normalized_values)) then
      normalized_values := array_append(normalized_values, 'new');
    end if;
    if not ('contacted' = any(normalized_values)) then
      normalized_values := array_append(normalized_values, 'contacted');
    end if;

    select string_agg(quote_literal(x), ', ' order by x)
    into value_sql
    from unnest(normalized_values) as x;

    execute format('alter table public.sales_leads drop constraint %I', constraint_name);
    execute format(
      'alter table public.sales_leads add constraint sales_leads_status_check check (status in (%s))',
      value_sql
    );
  end if;

  -- platform_events.event_name must accept lead_claimed
  select c.conname, pg_get_constraintdef(c.oid)
  into constraint_name, constraint_def
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'platform_events'
    and c.conname = 'platform_events_event_name_check'
  limit 1;

  if constraint_name is null then
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
          'lead_marked_won',
          'lead_claimed'
        )
      );
  elsif position('''lead_claimed''' in constraint_def) = 0 then
    select coalesce(array_agg(m[1]), array[]::text[])
    into allowed_values
    from regexp_matches(constraint_def, '''([^'']+)''', 'g') as m;

    normalized_values := array[]::text[];
    foreach v in array allowed_values
    loop
      if v is not null and not (v = any(normalized_values)) then
        normalized_values := array_append(normalized_values, v);
      end if;
    end loop;
    normalized_values := array_append(normalized_values, 'lead_claimed');

    select string_agg(quote_literal(x), ', ' order by x)
    into value_sql
    from unnest(normalized_values) as x;

    execute format('alter table public.platform_events drop constraint %I', constraint_name);
    execute format(
      'alter table public.platform_events add constraint platform_events_event_name_check check (event_name in (%s))',
      value_sql
    );
  end if;

  -- ai_assignments.priority must accept high/medium
  select c.conname, pg_get_constraintdef(c.oid)
  into constraint_name, constraint_def
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'ai_assignments'
    and c.conname = 'ai_assignments_priority_check'
  limit 1;

  if constraint_name is null then
    alter table public.ai_assignments
      add constraint ai_assignments_priority_check
      check (priority in ('low', 'medium', 'high', 'urgent'));
  elsif position('''high''' in constraint_def) = 0 or position('''medium''' in constraint_def) = 0 then
    select coalesce(array_agg(m[1]), array[]::text[])
    into allowed_values
    from regexp_matches(constraint_def, '''([^'']+)''', 'g') as m;

    normalized_values := array[]::text[];
    foreach v in array allowed_values
    loop
      if v is not null and not (v = any(normalized_values)) then
        normalized_values := array_append(normalized_values, v);
      end if;
    end loop;
    if not ('high' = any(normalized_values)) then
      normalized_values := array_append(normalized_values, 'high');
    end if;
    if not ('medium' = any(normalized_values)) then
      normalized_values := array_append(normalized_values, 'medium');
    end if;

    select string_agg(quote_literal(x), ', ' order by x)
    into value_sql
    from unnest(normalized_values) as x;

    execute format('alter table public.ai_assignments drop constraint %I', constraint_name);
    execute format(
      'alter table public.ai_assignments add constraint ai_assignments_priority_check check (priority in (%s))',
      value_sql
    );
  end if;

  -- ai_assignments.status must accept assigned
  select c.conname, pg_get_constraintdef(c.oid)
  into constraint_name, constraint_def
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'ai_assignments'
    and c.conname = 'ai_assignments_status_check'
  limit 1;

  if constraint_name is null then
    alter table public.ai_assignments
      add constraint ai_assignments_status_check
      check (status in ('assigned', 'in_progress', 'awaiting_approval', 'approved', 'rejected', 'completed', 'blocked'));
  elsif position('''assigned''' in constraint_def) = 0 then
    select coalesce(array_agg(m[1]), array[]::text[])
    into allowed_values
    from regexp_matches(constraint_def, '''([^'']+)''', 'g') as m;

    normalized_values := array[]::text[];
    foreach v in array allowed_values
    loop
      if v is not null and not (v = any(normalized_values)) then
        normalized_values := array_append(normalized_values, v);
      end if;
    end loop;
    normalized_values := array_append(normalized_values, 'assigned');

    select string_agg(quote_literal(x), ', ' order by x)
    into value_sql
    from unnest(normalized_values) as x;

    execute format('alter table public.ai_assignments drop constraint %I', constraint_name);
    execute format(
      'alter table public.ai_assignments add constraint ai_assignments_status_check check (status in (%s))',
      value_sql
    );
  end if;
end $$;

do $$
declare
  missing text[] := array[]::text[];
begin
  -- Table checks
  if to_regclass('public.marketplace_leads') is null then
    missing := array_append(missing, 'table public.marketplace_leads');
  end if;
  if to_regclass('public.customers') is null then
    missing := array_append(missing, 'table public.customers');
  end if;
  if to_regclass('public.sales_leads') is null then
    missing := array_append(missing, 'table public.sales_leads');
  end if;
  if to_regclass('public.ai_employees') is null then
    missing := array_append(missing, 'table public.ai_employees');
  end if;
  if to_regclass('public.ai_assignments') is null then
    missing := array_append(missing, 'table public.ai_assignments');
  end if;
  if to_regclass('public.marketplace_lead_audit_history') is null then
    missing := array_append(missing, 'table public.marketplace_lead_audit_history');
  end if;
  if to_regclass('public.platform_events') is null then
    missing := array_append(missing, 'table public.platform_events');
  end if;

  -- Column checks used by claim_marketplace_lead
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'marketplace_leads' and column_name = 'lead_id') then missing := array_append(missing, 'column marketplace_leads.lead_id'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'marketplace_leads' and column_name = 'business_name') then missing := array_append(missing, 'column marketplace_leads.business_name'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'marketplace_leads' and column_name = 'contact_name') then missing := array_append(missing, 'column marketplace_leads.contact_name'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'marketplace_leads' and column_name = 'email') then missing := array_append(missing, 'column marketplace_leads.email'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'marketplace_leads' and column_name = 'phone') then missing := array_append(missing, 'column marketplace_leads.phone'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'marketplace_leads' and column_name = 'address') then missing := array_append(missing, 'column marketplace_leads.address'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'marketplace_leads' and column_name = 'property_type') then missing := array_append(missing, 'column marketplace_leads.property_type'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'marketplace_leads' and column_name = 'service_requested') then missing := array_append(missing, 'column marketplace_leads.service_requested'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'marketplace_leads' and column_name = 'notes') then missing := array_append(missing, 'column marketplace_leads.notes'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'marketplace_leads' and column_name = 'status') then missing := array_append(missing, 'column marketplace_leads.status'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'marketplace_leads' and column_name = 'qualification_status') then missing := array_append(missing, 'column marketplace_leads.qualification_status'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'marketplace_leads' and column_name = 'claimed_at') then missing := array_append(missing, 'column marketplace_leads.claimed_at'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'marketplace_leads' and column_name = 'claimed_by_user_id') then missing := array_append(missing, 'column marketplace_leads.claimed_by_user_id'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'marketplace_leads' and column_name = 'claimed_by_user_email') then missing := array_append(missing, 'column marketplace_leads.claimed_by_user_email'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'marketplace_leads' and column_name = 'claimed_company_id') then missing := array_append(missing, 'column marketplace_leads.claimed_company_id'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'marketplace_leads' and column_name = 'claimed_sales_lead_id') then missing := array_append(missing, 'column marketplace_leads.claimed_sales_lead_id'); end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'customers' and column_name = 'id') then missing := array_append(missing, 'column customers.id'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'customers' and column_name = 'tenant_id') then missing := array_append(missing, 'column customers.tenant_id'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'customers' and column_name = 'company_name') then missing := array_append(missing, 'column customers.company_name'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'customers' and column_name = 'contact_name') then missing := array_append(missing, 'column customers.contact_name'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'customers' and column_name = 'phone') then missing := array_append(missing, 'column customers.phone'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'customers' and column_name = 'email') then missing := array_append(missing, 'column customers.email'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'customers' and column_name = 'address') then missing := array_append(missing, 'column customers.address'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'customers' and column_name = 'notes') then missing := array_append(missing, 'column customers.notes'); end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sales_leads' and column_name = 'id') then missing := array_append(missing, 'column sales_leads.id'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sales_leads' and column_name = 'tenant_id') then missing := array_append(missing, 'column sales_leads.tenant_id'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sales_leads' and column_name = 'contact_name') then missing := array_append(missing, 'column sales_leads.contact_name'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sales_leads' and column_name = 'company_name') then missing := array_append(missing, 'column sales_leads.company_name'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sales_leads' and column_name = 'email') then missing := array_append(missing, 'column sales_leads.email'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sales_leads' and column_name = 'phone') then missing := array_append(missing, 'column sales_leads.phone'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sales_leads' and column_name = 'employee_count') then missing := array_append(missing, 'column sales_leads.employee_count'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sales_leads' and column_name = 'business_type') then missing := array_append(missing, 'column sales_leads.business_type'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sales_leads' and column_name = 'current_software') then missing := array_append(missing, 'column sales_leads.current_software'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sales_leads' and column_name = 'message') then missing := array_append(missing, 'column sales_leads.message'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sales_leads' and column_name = 'source') then missing := array_append(missing, 'column sales_leads.source'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sales_leads' and column_name = 'status') then missing := array_append(missing, 'column sales_leads.status'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sales_leads' and column_name = 'founding_partner_interest') then missing := array_append(missing, 'column sales_leads.founding_partner_interest'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sales_leads' and column_name = 'internal_notes') then missing := array_append(missing, 'column sales_leads.internal_notes'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sales_leads' and column_name = 'origin_marketplace_lead_id') then missing := array_append(missing, 'column sales_leads.origin_marketplace_lead_id'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sales_leads' and column_name = 'converted_customer_id') then missing := array_append(missing, 'column sales_leads.converted_customer_id'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sales_leads' and column_name = 'next_follow_up_at') then missing := array_append(missing, 'column sales_leads.next_follow_up_at'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sales_leads' and column_name = 'updated_at') then missing := array_append(missing, 'column sales_leads.updated_at'); end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ai_employees' and column_name = 'id') then missing := array_append(missing, 'column ai_employees.id'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ai_employees' and column_name = 'slug') then missing := array_append(missing, 'column ai_employees.slug'); end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ai_assignments' and column_name = 'employee_id') then missing := array_append(missing, 'column ai_assignments.employee_id'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ai_assignments' and column_name = 'super_admin_user_id') then missing := array_append(missing, 'column ai_assignments.super_admin_user_id'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ai_assignments' and column_name = 'title') then missing := array_append(missing, 'column ai_assignments.title'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ai_assignments' and column_name = 'instructions') then missing := array_append(missing, 'column ai_assignments.instructions'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ai_assignments' and column_name = 'due_date') then missing := array_append(missing, 'column ai_assignments.due_date'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ai_assignments' and column_name = 'priority') then missing := array_append(missing, 'column ai_assignments.priority'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ai_assignments' and column_name = 'status') then missing := array_append(missing, 'column ai_assignments.status'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ai_assignments' and column_name = 'approval_required') then missing := array_append(missing, 'column ai_assignments.approval_required'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ai_assignments' and column_name = 'is_recurring') then missing := array_append(missing, 'column ai_assignments.is_recurring'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ai_assignments' and column_name = 'is_one_time') then missing := array_append(missing, 'column ai_assignments.is_one_time'); end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'marketplace_lead_audit_history' and column_name = 'lead_id') then missing := array_append(missing, 'column marketplace_lead_audit_history.lead_id'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'marketplace_lead_audit_history' and column_name = 'changed_by') then missing := array_append(missing, 'column marketplace_lead_audit_history.changed_by'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'marketplace_lead_audit_history' and column_name = 'action') then missing := array_append(missing, 'column marketplace_lead_audit_history.action'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'marketplace_lead_audit_history' and column_name = 'change_summary') then missing := array_append(missing, 'column marketplace_lead_audit_history.change_summary'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'marketplace_lead_audit_history' and column_name = 'before_data') then missing := array_append(missing, 'column marketplace_lead_audit_history.before_data'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'marketplace_lead_audit_history' and column_name = 'after_data') then missing := array_append(missing, 'column marketplace_lead_audit_history.after_data'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'marketplace_lead_audit_history' and column_name = 'metadata') then missing := array_append(missing, 'column marketplace_lead_audit_history.metadata'); end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'platform_events' and column_name = 'event_name') then missing := array_append(missing, 'column platform_events.event_name'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'platform_events' and column_name = 'event_source') then missing := array_append(missing, 'column platform_events.event_source'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'platform_events' and column_name = 'page_path') then missing := array_append(missing, 'column platform_events.page_path'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'platform_events' and column_name = 'metadata') then missing := array_append(missing, 'column platform_events.metadata'); end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'platform_events' and column_name = 'user_id') then missing := array_append(missing, 'column platform_events.user_id'); end if;

  -- Constraint checks
  if not exists (select 1 from pg_constraint where conname = 'marketplace_leads_claimed_by_user_id_fkey') then missing := array_append(missing, 'constraint marketplace_leads_claimed_by_user_id_fkey'); end if;
  if not exists (select 1 from pg_constraint where conname = 'marketplace_leads_claimed_company_id_fkey') then missing := array_append(missing, 'constraint marketplace_leads_claimed_company_id_fkey'); end if;
  if not exists (select 1 from pg_constraint where conname = 'marketplace_leads_claimed_sales_lead_id_fkey') then missing := array_append(missing, 'constraint marketplace_leads_claimed_sales_lead_id_fkey'); end if;
  if not exists (select 1 from pg_constraint where conname = 'sales_leads_origin_marketplace_lead_id_fkey') then missing := array_append(missing, 'constraint sales_leads_origin_marketplace_lead_id_fkey'); end if;
  if not exists (select 1 from pg_constraint where conname = 'marketplace_leads_status_check') then missing := array_append(missing, 'constraint marketplace_leads_status_check'); end if;
  if not exists (select 1 from pg_constraint where conname = 'marketplace_leads_qualification_status_check') then missing := array_append(missing, 'constraint marketplace_leads_qualification_status_check'); end if;
  if not exists (select 1 from pg_constraint where conname = 'sales_leads_source_check') then missing := array_append(missing, 'constraint sales_leads_source_check'); end if;
  if not exists (select 1 from pg_constraint where conname = 'sales_leads_status_check') then missing := array_append(missing, 'constraint sales_leads_status_check'); end if;
  if not exists (select 1 from pg_constraint where conname = 'platform_events_event_name_check') then missing := array_append(missing, 'constraint platform_events_event_name_check'); end if;
  if not exists (select 1 from pg_constraint where conname = 'ai_assignments_priority_check') then missing := array_append(missing, 'constraint ai_assignments_priority_check'); end if;
  if not exists (select 1 from pg_constraint where conname = 'ai_assignments_status_check') then missing := array_append(missing, 'constraint ai_assignments_status_check'); end if;

  -- Index checks
  if to_regclass('public.marketplace_leads_claimed_at_idx') is null then missing := array_append(missing, 'index marketplace_leads_claimed_at_idx'); end if;
  if to_regclass('public.marketplace_leads_claimed_by_user_id_idx') is null then missing := array_append(missing, 'index marketplace_leads_claimed_by_user_id_idx'); end if;
  if to_regclass('public.marketplace_leads_claimed_by_user_email_idx') is null then missing := array_append(missing, 'index marketplace_leads_claimed_by_user_email_idx'); end if;
  if to_regclass('public.marketplace_leads_claimed_company_id_idx') is null then missing := array_append(missing, 'index marketplace_leads_claimed_company_id_idx'); end if;
  if to_regclass('public.sales_leads_origin_marketplace_lead_uidx') is null then missing := array_append(missing, 'index sales_leads_origin_marketplace_lead_uidx'); end if;
  if to_regclass('public.ai_employees_slug_idx') is null then missing := array_append(missing, 'index ai_employees_slug_idx'); end if;

  -- Check-value checks
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'marketplace_leads'
      and c.conname = 'marketplace_leads_status_check'
      and position('''Claimed''' in pg_get_constraintdef(c.oid)) > 0
  ) then missing := array_append(missing, 'check value marketplace_leads.status -> Claimed'); end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'marketplace_leads'
      and c.conname = 'marketplace_leads_qualification_status_check'
      and position('''Verified''' in pg_get_constraintdef(c.oid)) > 0
  ) then missing := array_append(missing, 'check value marketplace_leads.qualification_status -> Verified'); end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'sales_leads'
      and c.conname = 'sales_leads_source_check'
      and position('''lead_marketplace''' in pg_get_constraintdef(c.oid)) > 0
  ) then missing := array_append(missing, 'check value sales_leads.source -> lead_marketplace'); end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'sales_leads'
      and c.conname = 'sales_leads_status_check'
      and position('''new''' in pg_get_constraintdef(c.oid)) > 0
      and position('''contacted''' in pg_get_constraintdef(c.oid)) > 0
  ) then missing := array_append(missing, 'check values sales_leads.status -> new/contacted'); end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'platform_events'
      and c.conname = 'platform_events_event_name_check'
      and position('''lead_claimed''' in pg_get_constraintdef(c.oid)) > 0
  ) then missing := array_append(missing, 'check value platform_events.event_name -> lead_claimed'); end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'ai_assignments'
      and c.conname = 'ai_assignments_priority_check'
      and position('''high''' in pg_get_constraintdef(c.oid)) > 0
      and position('''medium''' in pg_get_constraintdef(c.oid)) > 0
  ) then missing := array_append(missing, 'check values ai_assignments.priority -> high/medium'); end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'ai_assignments'
      and c.conname = 'ai_assignments_status_check'
      and position('''assigned''' in pg_get_constraintdef(c.oid)) > 0
  ) then missing := array_append(missing, 'check value ai_assignments.status -> assigned'); end if;

  if array_length(missing, 1) is not null then
    raise exception 'claim_marketplace_lead dependency audit failed: %', array_to_string(missing, '; ');
  end if;
end $$;

notify pgrst, 'reload schema';
