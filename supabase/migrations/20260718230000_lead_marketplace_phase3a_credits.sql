-- Lead Marketplace Phase 3A: Lead Credits
-- Additive migration only.

create table if not exists public.marketplace_credit_balances (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  lifetime_purchased integer not null default 0,
  lifetime_spent integer not null default 0,
  lifetime_refunded integer not null default 0,
  lifetime_promotional integer not null default 0,
  lifetime_adjustment integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_transaction_at timestamptz
);

create table if not exists public.marketplace_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  transaction_type text not null check (
    transaction_type in ('purchased', 'spent', 'refunded', 'promotional', 'adjustment')
  ),
  credits_delta integer not null check (credits_delta <> 0),
  balance_after integer not null check (balance_after >= 0),
  reference_key text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  idempotency_key text,
  stripe_event_id text,
  stripe_checkout_session_id text,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.marketplace_credit_webhook_events (
  event_id text primary key,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now()
);

create index if not exists marketplace_credit_transactions_tenant_created_idx
  on public.marketplace_credit_transactions(tenant_id, created_at desc);

create index if not exists marketplace_credit_transactions_type_created_idx
  on public.marketplace_credit_transactions(transaction_type, created_at desc);

create unique index if not exists marketplace_credit_transactions_idempotency_uidx
  on public.marketplace_credit_transactions(idempotency_key)
  where idempotency_key is not null;

create unique index if not exists marketplace_credit_transactions_stripe_event_uidx
  on public.marketplace_credit_transactions(stripe_event_id)
  where stripe_event_id is not null;

create unique index if not exists marketplace_credit_transactions_session_uidx
  on public.marketplace_credit_transactions(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index if not exists marketplace_credit_transactions_reference_uidx
  on public.marketplace_credit_transactions(tenant_id, reference_key)
  where reference_key is not null;

create or replace function public.marketplace_apply_credit_transaction(
  target_tenant_id uuid,
  tx_type text,
  delta integer,
  tx_reference_key text default null,
  tx_reason text default null,
  tx_metadata jsonb default '{}'::jsonb,
  actor_user_id uuid default null,
  tx_idempotency_key text default null,
  tx_stripe_event_id text default null,
  tx_stripe_session_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  current_balance_row public.marketplace_credit_balances%rowtype;
  existing_tx public.marketplace_credit_transactions%rowtype;
  next_balance integer;
  purchased_delta integer := 0;
  spent_delta integer := 0;
  refunded_delta integer := 0;
  promotional_delta integer := 0;
  adjustment_delta integer := 0;
begin
  if target_tenant_id is null then
    raise exception 'target_tenant_id is required';
  end if;

  if tx_type not in ('purchased', 'spent', 'refunded', 'promotional', 'adjustment') then
    raise exception 'Unsupported transaction_type: %', tx_type;
  end if;

  if delta = 0 then
    raise exception 'delta cannot be 0';
  end if;

  if tx_idempotency_key is not null then
    select *
    into existing_tx
    from public.marketplace_credit_transactions
    where idempotency_key = tx_idempotency_key
    limit 1;

    if found then
      return jsonb_build_object(
        'applied', false,
        'balance', existing_tx.balance_after,
        'transactionId', existing_tx.id,
        'creditsDelta', existing_tx.credits_delta,
        'transactionType', existing_tx.transaction_type
      );
    end if;
  end if;

  if tx_stripe_session_id is not null then
    select *
    into existing_tx
    from public.marketplace_credit_transactions
    where stripe_checkout_session_id = tx_stripe_session_id
    limit 1;

    if found then
      return jsonb_build_object(
        'applied', false,
        'balance', existing_tx.balance_after,
        'transactionId', existing_tx.id,
        'creditsDelta', existing_tx.credits_delta,
        'transactionType', existing_tx.transaction_type
      );
    end if;
  end if;

  insert into public.marketplace_credit_balances (tenant_id)
  values (target_tenant_id)
  on conflict (tenant_id) do nothing;

  select *
  into current_balance_row
  from public.marketplace_credit_balances
  where tenant_id = target_tenant_id
  for update;

  next_balance := current_balance_row.balance + delta;
  if next_balance < 0 then
    raise exception 'Insufficient marketplace credits.';
  end if;

  if tx_type = 'purchased' then
    purchased_delta := abs(delta);
  elsif tx_type = 'spent' then
    spent_delta := abs(delta);
  elsif tx_type = 'refunded' then
    refunded_delta := abs(delta);
  elsif tx_type = 'promotional' then
    promotional_delta := abs(delta);
  elsif tx_type = 'adjustment' then
    adjustment_delta := delta;
  end if;

  update public.marketplace_credit_balances
  set
    balance = next_balance,
    lifetime_purchased = lifetime_purchased + purchased_delta,
    lifetime_spent = lifetime_spent + spent_delta,
    lifetime_refunded = lifetime_refunded + refunded_delta,
    lifetime_promotional = lifetime_promotional + promotional_delta,
    lifetime_adjustment = lifetime_adjustment + adjustment_delta,
    last_transaction_at = now(),
    updated_at = now()
  where tenant_id = target_tenant_id;

  insert into public.marketplace_credit_transactions (
    tenant_id,
    transaction_type,
    credits_delta,
    balance_after,
    reference_key,
    reason,
    metadata,
    idempotency_key,
    stripe_event_id,
    stripe_checkout_session_id,
    created_by_user_id
  ) values (
    target_tenant_id,
    tx_type,
    delta,
    next_balance,
    tx_reference_key,
    tx_reason,
    coalesce(tx_metadata, '{}'::jsonb),
    tx_idempotency_key,
    tx_stripe_event_id,
    tx_stripe_session_id,
    actor_user_id
  )
  returning * into existing_tx;

  return jsonb_build_object(
    'applied', true,
    'balance', next_balance,
    'transactionId', existing_tx.id,
    'creditsDelta', existing_tx.credits_delta,
    'transactionType', existing_tx.transaction_type
  );
end;
$$;

create or replace function public.marketplace_apply_credit_purchase(
  target_tenant_id uuid,
  package_id text,
  package_credits integer,
  package_amount_cents integer,
  stripe_event_id text,
  stripe_checkout_session_id text,
  actor_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  result jsonb;
begin
  if package_credits <= 0 then
    raise exception 'package_credits must be > 0';
  end if;

  result := public.marketplace_apply_credit_transaction(
    target_tenant_id,
    'purchased',
    package_credits,
    format('stripe_purchase:%s', stripe_checkout_session_id),
    format('Stripe package purchase: %s', package_id),
    jsonb_build_object(
      'packageId', package_id,
      'credits', package_credits,
      'amountCents', package_amount_cents,
      'currency', 'usd'
    ),
    actor_user_id,
    format('stripe:%s', stripe_event_id),
    stripe_event_id,
    stripe_checkout_session_id
  );

  return result;
end;
$$;

create or replace function public.marketplace_grant_intro_credit(target_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  perform public.marketplace_apply_credit_transaction(
    target_tenant_id,
    'promotional',
    1,
    'intro_free_credit',
    'Introductory marketplace credit grant.',
    jsonb_build_object(
      'promoCode', 'intro_free_credit',
      'nonRefundableCash', true,
      'refundableForMarketplaceLeadApproval', true
    ),
    null,
    format('intro:%s', target_tenant_id),
    null,
    null
  );
exception
  when others then
    -- No-op for idempotent replay scenarios (already granted by unique keys).
    if SQLSTATE not in ('23505') then
      raise;
    end if;
end;
$$;

create or replace function public.trg_grant_intro_marketplace_credit()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  perform public.marketplace_grant_intro_credit(new.id);
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_grant_intro_marketplace_credit_on_tenant'
  ) then
    create trigger trg_grant_intro_marketplace_credit_on_tenant
    after insert on public.tenants
    for each row
    execute function public.trg_grant_intro_marketplace_credit();
  end if;
end $$;

-- One-time backfill for existing tenants (idempotent).
do $$
declare
  t record;
begin
  for t in select id from public.tenants loop
    perform public.marketplace_grant_intro_credit(t.id);
  end loop;
end $$;

create or replace function public.claim_marketplace_lead(
  target_lead_id uuid,
  target_tenant_id uuid,
  claiming_user_id uuid,
  claiming_user_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  lead_row public.marketplace_leads%rowtype;
  customer_row public.customers%rowtype;
  sales_lead_row public.sales_leads%rowtype;
  employee_row record;
  task_template record;
  task_count integer := 0;
  now_iso timestamptz := now();
  claim_note text;
  credit_row public.marketplace_credit_balances%rowtype;
  balance_before integer := 0;
  balance_after integer := 0;
begin
  select *
  into lead_row
  from public.marketplace_leads
  where lead_id = target_lead_id
  for update;

  if not found then
    raise exception 'Lead not found.';
  end if;

  if lead_row.claimed_at is not null or lead_row.status = 'Claimed' then
    raise exception 'Lead has already been claimed.';
  end if;

  if lead_row.qualification_status <> 'Verified' then
    raise exception 'Lead must be verified before it can be claimed.';
  end if;

  insert into public.marketplace_credit_balances (tenant_id)
  values (target_tenant_id)
  on conflict (tenant_id) do nothing;

  select *
  into credit_row
  from public.marketplace_credit_balances
  where tenant_id = target_tenant_id
  for update;

  balance_before := coalesce(credit_row.balance, 0);
  if balance_before < 1 then
    raise exception 'Insufficient marketplace credits.';
  end if;

  select *
  into customer_row
  from public.customers
  where tenant_id = target_tenant_id
    and (
      lower(email) = lower(lead_row.email)
      or lower(company_name) = lower(lead_row.business_name)
    )
  order by
    case when lower(email) = lower(lead_row.email) then 0 else 1 end,
    created_at asc
  limit 1;

  if not found then
    insert into public.customers (
      tenant_id,
      company_name,
      contact_name,
      phone,
      email,
      address,
      notes
    ) values (
      target_tenant_id,
      lead_row.business_name,
      lead_row.contact_name,
      lead_row.phone,
      lead_row.email,
      lead_row.address,
      'Imported from Lead Marketplace claim workflow.'
    )
    returning * into customer_row;
  end if;

  claim_note := format(
    'Imported from Lead Marketplace claim for %s (%s).',
    lead_row.business_name,
    lead_row.email
  );

  insert into public.sales_leads (
    tenant_id,
    contact_name,
    company_name,
    email,
    phone,
    employee_count,
    business_type,
    current_software,
    message,
    source,
    status,
    founding_partner_interest,
    internal_notes,
    origin_marketplace_lead_id,
    converted_customer_id
  ) values (
    target_tenant_id,
    lead_row.contact_name,
    lead_row.business_name,
    lead_row.email,
    lead_row.phone,
    null,
    lead_row.property_type,
    null,
    concat_ws(E'\n\n', lead_row.service_requested, lead_row.notes, claim_note),
    'lead_marketplace',
    'new',
    false,
    claim_note,
    lead_row.lead_id,
    customer_row.id
  )
  returning * into sales_lead_row;

  update public.sales_leads
  set
    status = 'contacted',
    next_follow_up_at = now_iso + interval '2 days',
    updated_at = now_iso
  where id = sales_lead_row.id
  returning * into sales_lead_row;

  for task_template in
    select *
    from (
      values
        ('lead-researcher', 'Research and verify the claimed lead', 'Investigate the business, confirm fit, and gather contact insights.', 'high'),
        ('sales-manager', 'Build a close plan for the claimed lead', 'Prepare outreach strategy, objection handling, and next-step sequencing.', 'high'),
        ('voice-representative', 'Call the claimed lead', 'Prepare a call script, confirm service needs, and schedule the first conversation.', 'high'),
        ('marketing-manager', 'Create local follow-up messaging', 'Draft nurture copy and campaign angles that support conversion.', 'medium'),
        ('customer-success-manager', 'Prepare onboarding readiness notes', 'Identify risk factors, onboarding needs, and retention considerations.', 'medium'),
        ('operations-manager', 'Plan service delivery for the claim', 'Review scope, staffing, and operational requirements for the lead.', 'medium')
    ) as template(employee_slug, title, instructions, priority)
  loop
    select id
    into employee_row
    from public.ai_employees
    where slug = task_template.employee_slug;

    if found then
      insert into public.ai_assignments (
        employee_id,
        super_admin_user_id,
        title,
        instructions,
        due_date,
        priority,
        status,
        approval_required,
        is_recurring,
        is_one_time
      ) values (
        employee_row.id,
        claiming_user_id,
        format('Lead Claim: %s', task_template.title),
        format(
          '%s\n\nLead: %s\nContact: %s\nEmail: %s\nPhone: %s\nClaimed customer id: %s\nCRM opportunity id: %s',
          task_template.instructions,
          lead_row.business_name,
          lead_row.contact_name,
          lead_row.email,
          lead_row.phone,
          customer_row.id,
          sales_lead_row.id
        ),
        (current_date + 7),
        task_template.priority,
        'assigned',
        false,
        false,
        true
      );

      task_count := task_count + 1;
    end if;
  end loop;

  insert into public.marketplace_lead_audit_history (
    lead_id,
    changed_by,
    action,
    change_summary,
    before_data,
    after_data,
    metadata
  ) values (
    lead_row.lead_id,
    claiming_user_id,
    'claimed',
    'Lead claimed and imported into CRM.',
    to_jsonb(lead_row),
    jsonb_build_object(
      'lead_id', lead_row.lead_id,
      'claimed_at', now_iso,
      'claimed_by_user_id', claiming_user_id,
      'claimed_company_id', customer_row.id,
      'claimed_sales_lead_id', sales_lead_row.id,
      'status', 'Claimed'
    ),
    jsonb_build_object(
      'customer_id', customer_row.id,
      'sales_lead_id', sales_lead_row.id,
      'task_count', task_count
    )
  );

  -- Analytics stays optional/non-critical.
  if to_regclass('public.platform_events') is not null then
    begin
      insert into public.platform_events (
        event_name,
        event_source,
        page_path,
        metadata,
        user_id
      ) values (
        'lead_claimed',
        'crm',
        '/super-admin/lead-marketplace',
        jsonb_build_object(
          'leadId', lead_row.lead_id,
          'businessName', lead_row.business_name,
          'customerId', customer_row.id,
          'salesLeadId', sales_lead_row.id,
          'taskCount', task_count
        ),
        claiming_user_id
      );
    exception
      when others then
        null;
    end;
  end if;

  update public.marketplace_leads
  set
    status = 'Claimed',
    claimed_at = now_iso,
    claimed_by_user_id = claiming_user_id,
    claimed_by_user_email = claiming_user_email,
    claimed_company_id = customer_row.id,
    claimed_sales_lead_id = sales_lead_row.id
  where lead_id = lead_row.lead_id;

  balance_after := balance_before - 1;
  update public.marketplace_credit_balances
  set
    balance = balance_after,
    lifetime_spent = lifetime_spent + 1,
    last_transaction_at = now(),
    updated_at = now()
  where tenant_id = target_tenant_id;

  insert into public.marketplace_credit_transactions (
    tenant_id,
    transaction_type,
    credits_delta,
    balance_after,
    reference_key,
    reason,
    metadata,
    idempotency_key,
    created_by_user_id
  ) values (
    target_tenant_id,
    'spent',
    -1,
    balance_after,
    format('claim:%s', lead_row.lead_id),
    'Marketplace lead claim spend.',
    jsonb_build_object(
      'leadId', lead_row.lead_id,
      'claimedSalesLeadId', sales_lead_row.id,
      'claimedCompanyId', customer_row.id
    ),
    format('claim:%s:%s', target_tenant_id, lead_row.lead_id),
    claiming_user_id
  );

  return jsonb_build_object(
    'leadId', lead_row.lead_id,
    'claimedAt', now_iso,
    'claimedByUserId', claiming_user_id,
    'claimedByUserEmail', claiming_user_email,
    'claimedCompanyId', customer_row.id,
    'claimedSalesLeadId', sales_lead_row.id,
    'taskCount', task_count,
    'customerCompanyName', customer_row.company_name,
    'opportunityStatus', sales_lead_row.status,
    'leadCost', 1,
    'currentBalance', balance_before,
    'balanceAfterClaim', balance_after
  );
end;
$$;

grant select on public.marketplace_credit_balances to authenticated;
grant select on public.marketplace_credit_transactions to authenticated;
revoke all on public.marketplace_credit_webhook_events from public;
revoke all on public.marketplace_credit_webhook_events from anon;
revoke all on public.marketplace_credit_webhook_events from authenticated;
grant select, insert on public.marketplace_credit_webhook_events to service_role;

revoke all on function public.marketplace_apply_credit_transaction(uuid, text, integer, text, text, jsonb, uuid, text, text, text) from public;
revoke all on function public.marketplace_apply_credit_purchase(uuid, text, integer, integer, text, text, uuid) from public;
revoke all on function public.marketplace_grant_intro_credit(uuid) from public;
revoke all on function public.marketplace_apply_credit_transaction(uuid, text, integer, text, text, jsonb, uuid, text, text, text) from anon;
revoke all on function public.marketplace_apply_credit_purchase(uuid, text, integer, integer, text, text, uuid) from anon;
revoke all on function public.marketplace_grant_intro_credit(uuid) from anon;
revoke all on function public.marketplace_apply_credit_transaction(uuid, text, integer, text, text, jsonb, uuid, text, text, text) from authenticated;
revoke all on function public.marketplace_apply_credit_purchase(uuid, text, integer, integer, text, text, uuid) from authenticated;
revoke all on function public.marketplace_grant_intro_credit(uuid) from authenticated;

grant execute on function public.marketplace_apply_credit_transaction(uuid, text, integer, text, text, jsonb, uuid, text, text, text) to service_role;
grant execute on function public.marketplace_apply_credit_purchase(uuid, text, integer, integer, text, text, uuid) to service_role;
grant execute on function public.marketplace_grant_intro_credit(uuid) to service_role;

revoke all on function public.claim_marketplace_lead(uuid, uuid, uuid, text) from public;
revoke all on function public.claim_marketplace_lead(uuid, uuid, uuid, text) from anon;
grant execute on function public.claim_marketplace_lead(uuid, uuid, uuid, text) to authenticated;

notify pgrst, 'reload schema';
