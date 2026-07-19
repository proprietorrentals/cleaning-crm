-- Corrective backfill for introductory marketplace credits.
-- Goals:
-- 1) Existing tenants receive exactly one intro promotional credit.
-- 2) New tenants continue to receive one intro promotional credit via trigger.
-- 3) Re-running this migration remains idempotent.
-- 4) Purchased balances are preserved (only missing intro credit is added).

-- Ensure the default tenant exists so systems using default tenant routing can receive intro credit.
insert into public.tenants (id, company_name, owner_email, slug, plan, status)
values (
  '00000000-0000-0000-0000-000000000001',
  'Default Company',
  'admin@localhost',
  'default',
  'professional',
  'active'
)
on conflict (id) do update
set
  company_name = coalesce(public.tenants.company_name, excluded.company_name),
  owner_email = coalesce(public.tenants.owner_email, excluded.owner_email),
  slug = coalesce(public.tenants.slug, excluded.slug),
  plan = coalesce(public.tenants.plan, excluded.plan),
  status = coalesce(public.tenants.status, excluded.status);

-- Recreate helper to keep intro-grant behavior explicit and resilient.
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
    -- Ignore duplicate-replay conditions only; re-raise anything unexpected.
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

-- Corrective one-time backfill: source all tenants.
-- Idempotency is guaranteed by marketplace_apply_credit_transaction using intro idempotency key
-- and by unique keys on transaction reference/idempotency fields.
do $$
declare
  t record;
begin
  for t in select id from public.tenants loop
    perform public.marketplace_grant_intro_credit(t.id);
  end loop;
end $$;

notify pgrst, 'reload schema';
