-- Additive repair migration: make lead-claim analytics optional.
-- Core claim workflow remains transactional; analytics insert is best-effort.

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

  -- Analytics is optional and must never block a successful claim.
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

  return jsonb_build_object(
    'leadId', lead_row.lead_id,
    'claimedAt', now_iso,
    'claimedByUserId', claiming_user_id,
    'claimedByUserEmail', claiming_user_email,
    'claimedCompanyId', customer_row.id,
    'claimedSalesLeadId', sales_lead_row.id,
    'taskCount', task_count,
    'customerCompanyName', customer_row.company_name,
    'opportunityStatus', sales_lead_row.status
  );
end;
$$;

-- Updated dependency audit baseline: platform_events is optional/non-blocking.
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
end $$;

revoke all on function public.claim_marketplace_lead(uuid, uuid, uuid, text) from public;
revoke all on function public.claim_marketplace_lead(uuid, uuid, uuid, text) from anon;
grant execute on function public.claim_marketplace_lead(uuid, uuid, uuid, text) to authenticated;

notify pgrst, 'reload schema';
