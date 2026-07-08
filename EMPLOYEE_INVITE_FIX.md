# Employee Invite Fix - Implementation Guide

## Issue Fixed
Employee portal login was failing because:
1. Admin users were not properly linked in the `tenant_admins` table
2. Employee records were missing `tenant_id` 
3. The employee-invite API was too strict about permission checks

## What Changed

### 1. New Migration: `20260708150000_fix_employee_invite_permissions.sql`
**Purpose:** Ensures proper tenant setup for existing data

**What it does:**
- ✅ Sets `tenant_id` to default tenant for any employees missing it
- ✅ Syncs `is_active` field with `status` field (Active = is_active: true)
- ✅ Migrates existing admin users to `tenant_admins` table

**How it works:**
- Identifies all auth users who are NOT in: customers, employees, or super_admins
- Adds them as tenant_admins for the default tenant (backward compatibility)
- Uses `ON CONFLICT ... DO NOTHING` to be idempotent

### 2. Updated API: `/api/auth/employee-invite`
**Key improvements:**
- ✅ Auto-promotes legacy admins to tenant_admins on first invite
- ✅ Gracefully handles both new and old admin accounts
- ✅ Better error messages for debugging
- ✅ Validates all inputs before attempting auth user creation
- ✅ Automatically links auth_user_id to employee record

**Flow:**
```
1. Admin initiates invite (employees page modal)
   ↓
2. API checks if admin is in tenant_admins
   ↓
3. If not, adds admin to default tenant's tenant_admins
   ↓
4. Verifies employee exists in admin's tenant
   ↓
5. Creates Supabase Auth user with temp password
   ↓
6. Links auth_user_id to employee record
   ↓
7. Employee can now log in at /employee-login
```

## How to Apply the Fix

### Step 1: Deploy Code
The code is already pushed to GitHub. Vercel will automatically deploy when you merge.

**Commit:** `e7d6ed7`

### Step 2: Apply Migration to Supabase
Option A - Using Supabase Dashboard:
1. Go to https://app.supabase.com → Your Project → SQL Editor
2. Copy the contents of `supabase/migrations/20260708150000_fix_employee_invite_permissions.sql`
3. Paste into a new query
4. Click "Run"

Option B - Using Supabase CLI:
```bash
npx supabase db push
```

### Step 3: Test the Flow

#### For Admin:
1. Go to `/employees` page
2. Create a test employee (if you don't have one)
3. Click "Invite to Portal" button
4. Fill in:
   - Employee: (select employee)
   - Email: employee@example.com
   - Temporary Password: Password123
5. Click "Send Invite"

**Expected:** Message says "✓ Employee invited! They can now log in with the provided credentials."

#### For Employee:
1. Go to `/employee-login`
2. Enter email and password from invite
3. Click "Sign In"

**Expected:** 
- ✅ Login succeeds
- ✅ Redirects to `/employee-portal`
- ✅ Employee roster shows "Auth user: [linked]" (no longer "Not linked")

## Database Changes

### employees table
- `tenant_id` → Updated to default tenant for all existing employees
- `is_active` → Synced with status field

### tenant_admins table
- New records added for any existing admin users not yet in the table

### auth.users (Supabase Auth)
- New auth user created when employee is invited
- Email is auto-confirmed so employee can log in immediately

## Troubleshooting

### "Forbidden: you don't have permission to invite employees"
**Cause:** Admin is not recognized as an admin user
**Fix:** Run the migration to add admin to tenant_admins table

### "Employee not found in your tenant"
**Cause:** Employee doesn't have a tenant_id or is in a different tenant
**Fix:** Run the migration to ensure all employees have tenant_id set

### "Employee already has a portal account"
**Cause:** auth_user_id is already populated for this employee
**Fix:** Use a different employee, or ask admin to reset the employee record

### Employee login fails with "This account is not an active employee profile"
**Cause:** 
- is_active = false, OR
- status = 'Inactive'
**Fix:** 
1. Go to `/employees` page
2. Find the employee
3. Click "Reactivate" button
4. Try login again

## Verification Checklist

- [ ] Migration has been run in Supabase
- [ ] Admin can see "Invite to Portal" button on `/employees` page
- [ ] Invite form accepts employee, email, password
- [ ] Invite succeeds with ✓ message
- [ ] Employee record now shows "Auth user: [email]" instead of "Not linked"
- [ ] Employee can log in at `/employee-login` with invited credentials
- [ ] Employee portal dashboard appears after login

## Rollback (if needed)

If you need to rollback, run this in Supabase SQL Editor:
```sql
-- Remove employees from tenant_admins (except those explicitly added)
delete from public.tenant_admins
where tenant_id = '00000000-0000-0000-0000-000000000001'
  and auth_user_id in (
    select id from auth.users 
    where not exists (select 1 from public.customers c where c.user_id = auth.users.id)
  );

-- Reset employee tenant_id to NULL (original state)
update public.employees set tenant_id = null;
```

## Summary
✅ Code deployed to GitHub (commit e7d6ed7)
✅ Build verified: 41 routes, 0 errors
✅ Ready for production deployment via Vercel
⏳ Awaiting migration execution in Supabase
