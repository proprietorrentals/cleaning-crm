-- Lead Marketplace Phase 2
-- Adds claim workflow columns, CRM import linkage, and atomic claim orchestration.
-- Additive migration only. Preserves existing marketplace lead RLS and audit history.

alter table public.marketplace_leads
  add column if not exists claimed_at timestamptz,
  add column if not exists claimed_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists claimed_company_id uuid references public.customers(id) on delete set null,
  add column if not exists claimed_sales_lead_id uuid references public.sales_leads(id) on delete set null;

alter table public.marketplace_leads
  alter column claimed_at drop not null,
  alter column claimed_by_user_id drop not null,
  alter column claimed_company_id drop not null,
  alter column claimed_sales_lead_id drop not null;

alter table public.marketplace_leads
  drop constraint if exists marketplace_leads_status_check;
alter table public.marketplace_leads
  add constraint marketplace_leads_status_check
  check (status in ('new', 'reviewing', 'qualified', 'contacted', 'Claimed', 'closed_won', 'closed_lost'));

create index if not exists marketplace_leads_claimed_at_idx
  on public.marketplace_leads(claimed_at desc);

create index if not exists marketplace_leads_claimed_by_user_id_idx
  on public.marketplace_leads(claimed_by_user_id);

create index if not exists marketplace_leads_claimed_company_id_idx
  on public.marketplace_leads(claimed_company_id);

alter table public.sales_leads
  add column if not exists origin_marketplace_lead_id uuid references public.marketplace_leads(lead_id) on delete set null;

create unique index if not exists sales_leads_origin_marketplace_lead_uidx
  on public.sales_leads(origin_marketplace_lead_id)
  where origin_marketplace_lead_id is not null;

alter table public.sales_leads
  drop constraint if exists sales_leads_source_check;
alter table public.sales_leads
  add constraint sales_leads_source_check
  check (source in ('website', 'website_contact', 'demo_request', 'founding_partner', 'free_trial', 'lead_marketplace'));

alter table public.platform_events
  drop constraint if exists platform_events_event_name_check;
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

create or replace function public.claim_marketplace_lead(
  target_lead_id uuid,
  target_tenant_id uuid,
  claiming_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
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

  update public.marketplace_leads
  set
    status = 'Claimed',
    claimed_at = now_iso,
    claimed_by_user_id = claiming_user_id,
    claimed_company_id = customer_row.id,
    claimed_sales_lead_id = sales_lead_row.id
  where lead_id = lead_row.lead_id;

  return jsonb_build_object(
    'leadId', lead_row.lead_id,
    'claimedAt', now_iso,
    'claimedByUserId', claiming_user_id,
    'claimedCompanyId', customer_row.id,
    'claimedSalesLeadId', sales_lead_row.id,
    'taskCount', task_count,
    'customerCompanyName', customer_row.company_name,
    'opportunityStatus', sales_lead_row.status
  );
end;
$$;

grant execute on function public.claim_marketplace_lead(uuid, uuid, uuid) to authenticated;
