# Employee Onboarding Flow - Testing Guide

## Overview

This guide walks through the complete employee onboarding flow after the comprehensive fix has been applied.

**Status**: Code deployed to GitHub ✅  
**Next Step**: Execute the migration in Supabase, then test the flow

---

## Prerequisites

### 1. Run the Migration in Supabase

**Option A: Using Supabase Dashboard (Recommended)**

1. Go to https://app.supabase.com → Select your project
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/20260708160000_fix_employee_onboarding.sql`
5. Paste the SQL into the editor
6. Click **Run** (or press Ctrl+Enter)
7. Verify: "Success - no rows returned" (idempotent operation)

**Option B: Using Supabase CLI**

```bash
npx supabase db push
```

### 2. Verify the Migration Results

After running the migration, verify these in the Supabase dashboard:

**Check 1: Employees have tenant_id**
```sql
select count(*) as total, 
       count(tenant_id) as with_tenant_id,
       count(case when tenant_id is null then 1 end) as missing_tenant_id
from public.employees;
```

Expected: `total > 0` and `missing_tenant_id = 0`

**Check 2: Admins are in tenant_admins**
```sql
select count(*) as admin_count from public.tenant_admins;
```

Expected: `admin_count > 0` (your admin accounts should be listed)

---

## Complete Testing Flow

### Phase 1: Admin Login

**Step 1.1: Fresh Login**
1. Go to `/admin-login`
2. If you already have an account, log in with your email/password
3. If not, click "Create New Admin Account" and sign up with:
   - Email: your email
   - Password: secure password (8+ characters)
   - Company Name: your company name

**Expected Result**: ✅ Logged in, redirected to `/` (admin dashboard)

**Step 1.2: Verify Admin Status**
- Go to `/employees` page
- Page loads successfully (you have admin permission)
- You see "Employees" roster section

### Phase 2: Create an Employee

**Step 2.1: Add Employee to Roster**
1. On `/employees` page, scroll to **"Add employee"** form
2. Fill in:
   - First Name: `John`
   - Last Name: `Technician`
   - Email: `john.tech@company.com`
   - Phone: `555-1234`
   - Role: `Technician`
   - Department: `Field Service`
   - Hire Date: Any date
   - Status: `Active`
   - Portal Access: `Enabled`
3. Click **Add employee**

**Expected Result**: ✅ Message: "Employee added successfully."

**Step 2.2: Verify Employee Created**
- Employee appears in the roster
- Shows: "Auth user: Not linked" (no auth account yet)
- Portal access shows as "Active portal access"

### Phase 3: Invite Employee to Portal

**Step 3.1: Open Invite Modal**
1. On `/employees` page, click **"Invite to Portal"** button
2. Modal appears with form

**Step 3.2: Fill Invite Form**
1. **Employee dropdown**: Select "John Technician (john.tech@company.com) [Unlinked]"
2. **Email Address**: Enter `john.tech@company.com` (can be same or different)
3. **Temporary Password**: Enter `TechPassword123` (must be 8+ characters)
4. Click **Send Invite**

**Expected Result**: ✅ Success message:
```
✓ Employee invited! They can now log in with the provided credentials.
```

**Step 3.3: Verify Employee is Linked**
- Modal closes
- Roster refreshes
- Employee now shows: "Auth user: [email]" (not "Not linked")

### Phase 4: Employee Login

**Step 4.1: Logout from Admin**
1. Top right corner → Logout button (or go to `/login`)

**Step 4.2: Go to Employee Login**
1. Go to `/employee-login`
2. Or: Go to `/login` → Click "Employee Portal" card → "Sign In"

**Step 4.3: Log in as Employee**
1. Email: `john.tech@company.com`
2. Password: `TechPassword123`
3. Click **Sign In**

**Expected Result**: ✅ 
- Logs in successfully
- Redirected to `/employee-portal`
- Shows employee dashboard

### Phase 5: Employee Portal Access

**Step 5.1: Verify Employee Dashboard**
1. You're now on `/employee-portal`
2. Page displays employee information

**Step 5.2: Check Job Assignment**
1. Assign this employee to a job from admin (as test)
   - Go back to admin (`/jobs`)
   - Create or edit a job
   - Assign to "John Technician"
2. Log back into employee portal
3. Should see assigned jobs

**Step 5.3: Verify Data Isolation**
- Employee should only see their own assigned jobs
- Cannot see other employees' jobs
- Cannot access admin functionality

---

## Verification Checklist

- [ ] Admin can log in
- [ ] Admin can create employee
- [ ] "Invite to Portal" button works
- [ ] Invite creates auth user successfully
- [ ] Employee shows "Auth user: [email]" after invite
- [ ] Employee can log in with invited credentials
- [ ] Employee redirects to `/employee-portal`
- [ ] Employee sees only their assigned jobs
- [ ] Employee cannot access admin pages
- [ ] "Auth user: Not linked" changes to email after invite

---

## Troubleshooting

### Issue: "Forbidden: must be a tenant admin" when inviting

**Solution**:
1. Verify the migration ran successfully
2. Check admin is in `tenant_admins` table:
   ```sql
   select * from public.tenant_admins where email = 'your@email.com';
   ```
3. If not found, the migration didn't work - try running it again
4. Check browser console for detailed error logs

### Issue: "Employee not found in your tenant"

**Solution**:
1. Verify employee has `tenant_id` set:
   ```sql
   select id, first_name, tenant_id from public.employees 
   where first_name = 'John';
   ```
2. If `tenant_id` is NULL or wrong, the migration didn't run
3. Ensure migration completed without errors

### Issue: Employee can't log in

**Solution**:
1. Verify `auth_user_id` is populated:
   ```sql
   select id, first_name, auth_user_id, is_active from public.employees 
   where first_name = 'John';
   ```
2. Verify `is_active = true`
3. Check the auth user exists in `auth.users` table
4. Check browser console for login errors

### Issue: 500 Server Error during invite

**Solution**:
1. Check server logs (Vercel or local terminal)
2. Look for detailed error in the console output
3. Common causes:
   - RLS policy blocking access
   - Database constraint violations
   - Service role key not set correctly in `.env.local`

---

## Database Verification Queries

Use these in Supabase SQL Editor to verify the state:

```sql
-- View all admins
select auth_user_id, email, tenant_id from public.tenant_admins;

-- View all employees with their auth status
select id, first_name, last_name, email, auth_user_id, tenant_id, is_active, status 
from public.employees 
order by created_at desc;

-- View a specific employee's auth user
select id, first_name, auth_user_id 
from public.employees 
where first_name = 'John';

-- Verify tenant exists
select id, company_name, slug from public.tenants;
```

---

## After Testing

Once you've verified the complete flow works:

1. ✅ Commit any test data changes
2. ✅ Test with multiple employees
3. ✅ Verify on staging/production deployment
4. ✅ Document any issues found
5. ✅ Update this guide if needed

---

## Next Steps

- [ ] Run migration in Supabase
- [ ] Follow the testing flow above
- [ ] Report any issues found
- [ ] Verify on production Vercel deployment
- [ ] Monitor employee login success rate
