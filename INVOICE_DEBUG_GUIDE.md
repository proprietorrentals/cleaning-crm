# Invoice Debug Guide

## Debug Output on Customer Portal Invoices Page

When you visit `/customer-portal/invoices`, a blue debug section will show:
```
DEBUG: Customer: [customer-uuid] | User ID: [user-uuid] | Invoices: [count] (Pending: [count], Overdue: [count], Paid: [count])
```

### What to Check

1. **Customer ID** - Should be the customer's UUID (not empty)
2. **User ID** - Should match the logged-in auth user's UUID
3. **Invoice Count** - Should show invoices if they exist in the database
4. **Status Breakdown** - Shows pending, overdue, and paid invoice counts

## Browser Console Debugging

Open your browser's Developer Tools (F12) and check the Console tab for these logs:

### Success Logs
```
🔐 DEBUG - Logged-in auth user ID: [user-uuid]
👤 DEBUG - Matched customer: {id: "...", user_id: "...", company_name: "..."}
📄 DEBUG - Invoices returned: [count]
📄 DEBUG - First invoice sample: {id: "...", invoice_number: "...", customer_id: "...", ...}
```

### Error Logs
```
❌ Failed to fetch invoices: [error message]
❌ Invoice fetch error details: {message: "...", code: "...", details: "..."}
```

## Common Issues & Solutions

### Issue: "No invoices at this time" (but invoices exist in database)

**Possible Cause 1: RLS Policies Not Applied**
- Solution: Apply the migration `20240101010004_add_customer_portal_rls.sql` to Supabase
- Check Supabase Dashboard → SQL Editor → Run the migration

**Possible Cause 2: Invoices Don't Have Correct customer_id**
- The invoice's `customer_id` must match the customer record's `id`
- To verify: Check Supabase Dashboard → invoices table → verify customer_id values
- Invoices created before this fix may have NULL or incorrect customer_id

**Possible Cause 3: Customer Record Doesn't Have user_id**
- The customer's `user_id` must match the logged-in auth user's ID
- To verify: Check Supabase Dashboard → customers table → verify user_id values
- Customer profiles might not have been linked during signup

### Issue: RLS Error (403 Forbidden)
- Debug output will show: `Invoice fetch error details: {code: "...", message: "...forbidden..."}`
- Solution: Verify RLS policies are correctly applied to invoices table
- Check: Supabase Dashboard → Authentication → Policies → invoices table

## Manual Database Verification

To verify data consistency in Supabase:

### Check 1: Customer-User Linking
```sql
SELECT id, user_id, company_name 
FROM public.customers 
WHERE user_id IS NOT NULL;
```

### Check 2: Invoice-Customer Linking
```sql
SELECT i.id, i.invoice_number, i.customer_id, c.company_name
FROM public.invoices i
LEFT JOIN public.customers c ON i.customer_id = c.id
ORDER BY i.created_at DESC;
```

### Check 3: RLS Policy Test
```sql
-- Check if customer can see their own invoices via RLS
SELECT i.id, i.invoice_number, i.customer_id
FROM public.invoices i
WHERE customer_id IN (
  SELECT id FROM public.customers WHERE auth.uid() = user_id
);
```

## How Invoices are Created

1. **Admin Page** (`/invoices`):
   - Selects a completed job from the dropdown
   - Extracts `customer_id` from the job
   - Creates invoice with both `job_id` and `customer_id`

2. **Customer Portal** (`/customer-portal/invoices`):
   - Gets logged-in user ID from Supabase Auth
   - Finds customer record with matching `user_id`
   - Filters invoices by `customer_id = customer.id`
   - RLS policy enforces: `invoice.customer_id IN (SELECT id FROM customers WHERE auth.uid() = user_id)`

## Debug Logging Removal

When debugging is complete, remove the debug section from the JSX:
- Delete the blue debug box showing customer ID, user ID, and invoice counts
- Keep console.log statements for development builds
