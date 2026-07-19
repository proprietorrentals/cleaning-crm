-- Additive repair migration: sales_leads dependency for marketplace claim RPC.
-- Scope limited to missing sales_leads origin link + source constraint compatibility.

alter table public.sales_leads
  add column if not exists origin_marketplace_lead_id uuid
  references public.marketplace_leads(lead_id)
  on delete set null;

create unique index if not exists sales_leads_origin_marketplace_lead_uidx
  on public.sales_leads(origin_marketplace_lead_id)
  where origin_marketplace_lead_id is not null;

do $$
declare
  source_constraint_name text;
  source_constraint_def text;
  allowed_sources text[];
  source_value text;
  normalized_sources text[] := array[]::text[];
  source_list_sql text;
begin
  select c.conname, pg_get_constraintdef(c.oid)
  into source_constraint_name, source_constraint_def
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'sales_leads'
    and c.contype = 'c'
    and c.conname = 'sales_leads_source_check'
  limit 1;

  if source_constraint_name is null then
    alter table public.sales_leads
      add constraint sales_leads_source_check
      check (source in ('website', 'website_contact', 'demo_request', 'founding_partner', 'free_trial', 'lead_marketplace'));
  elsif position('lead_marketplace' in source_constraint_def) = 0 then
    select coalesce(array_agg(matches[1]), array[]::text[])
    into allowed_sources
    from regexp_matches(source_constraint_def, '''([^'']+)''', 'g') as matches;

    foreach source_value in array allowed_sources
    loop
      if source_value is not null and not (source_value = any(normalized_sources)) then
        normalized_sources := array_append(normalized_sources, source_value);
      end if;
    end loop;

    if not ('lead_marketplace' = any(normalized_sources)) then
      normalized_sources := array_append(normalized_sources, 'lead_marketplace');
    end if;

    select string_agg(quote_literal(v), ', ' order by v)
    into source_list_sql
    from unnest(normalized_sources) as v;

    execute format('alter table public.sales_leads drop constraint %I', source_constraint_name);
    execute format(
      'alter table public.sales_leads add constraint sales_leads_source_check check (source in (%s))',
      source_list_sql
    );
  end if;
end $$;

notify pgrst, 'reload schema';
