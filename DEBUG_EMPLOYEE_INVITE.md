# Employee Invite Debugging Guide

## Issue Summary

**Error**: "Invite failed: Failed to verify admin status"

This error occurs when the `POST /api/auth/employee-invite` endpoint cannot verify that the logged-in user is a tenant admin.

---

## Root Cause Analysis

The error typically indicates one of:

1. **Admin not in `tenant_admins` table**
   - User logged in before multi-tenant migration
   - Migration didn't run or wasn't completed
   - User was created with old signup flow

2. **`tenant_admins` table query failed**
   - Database connection issue
   - RLS policy preventing access
   - Service-role key not configured

3. **Default tenant doesn't exist**
   - Migration didn't create the default tenant
   - Tenant record was deleted

---

## Debug Steps

### Step 1: Check Your Auth Status

1. Go to your deployed app (Vercel URL or localhost)
2. Log in to `/admin-login`
3. Verify you're logged in successfully
4. Check browser Developer Tools → Network tab

### Step 2: Use Debug Endpoint

Call the debug endpoint to see your admin status:

**GET `/api/debug/admin-status`**

This endpoint returns:
```json
{
  "status": "debug_info",
  "current_user": {
    "id": "uuid-of-current-user",
    "email": "your@email.com"
  },
  "admin_check": {
    "in_tenant_admins": true/false,
    "record": { ... },
    "query_error": null
  },
  "all_admins": {
    "count": 2,
    "records": [ ... ]
  },
  "tenants": {
    "count": 1,
    "records": [ ... ]
  },
  "diagnostics": {
    "user_not_found_in_tenant_admins": false/true,
    "default_tenant_exists": true/false,
    "next_steps": [ ... ]
  }
}
```

**Expected Result:**
- ✅ `in_tenant_admins: true`
- ✅ `default_tenant_exists: true`
- ✅ Your user should be listed in `all_admins`

**If problem found:**
- ❌ `in_tenant_admins: false` → Proceed to Step 3
- ❌ `default_tenant_exists: false` → Proceed to Step 4

### Step 3: Check Console Logs

In browser Developer Tools → Console:

1. Try to invite an employee
2. Look for logs starting with "employee-invite:"
3. Copy the actual error message from the logs

Example error logs:
```
employee-invite: Caller user ID: abc123 Email: admin@company.com
employee-invite: Error querying tenant_admins - Details: {
  code: undefined,
  message: "...",
  details: "...",
  hint: "..."
}
```

### Step 4: Use Setup Endpoint (If Admin Not Found)

If the debug endpoint shows `in_tenant_admins: false`:

**POST `/api/setup/admin-init`** (no request body)

This endpoint will:
1. ✅ Create default tenant if missing
2. ✅ Add you to `tenant_admins`
3. ✅ Create settings row
4. ✅ Return success status

**Expected Response:**
```json
{
  "status": "success",
  "message": "Admin account initialized successfully",
  "tenant_id": "00000000-0000-0000-0000-000000000001",
  "user_email": "your@email.com"
}
```

After this, go back to Step 2 to verify the fix.

---

## Detailed Troubleshooting

### Issue: "in_tenant_admins: false" on debug endpoint

**Solution**: Use setup endpoint

1. POST `/api/setup/admin-init`
2. Check the response for success
3. Verify with GET `/api/debug/admin-status`
4. Try inviting employee again

### Issue: "default_tenant_exists: false" on debug endpoint

**Solution**: Setup endpoint will create it

The `/api/setup/admin-init` endpoint automatically creates the default tenant, so:
1. POST `/api/setup/admin-init`
2. Verify success
3. Check debug endpoint again

### Issue: Setup endpoint also fails

**Possible causes**:
1. Service-role key not set in `.env.local`
2. Database connection issue
3. Supabase database is down

**Solution**:
1. Check `.env.local` has `SUPABASE_SERVICE_ROLE_KEY` set
2. Check Vercel logs for database errors
3. Verify Supabase is accessible at https://app.supabase.com
4. Check database migrations have been applied

### Issue: Invite works but "Auth user: Not linked" persists

**Possible causes**:
1. New auth user not properly linked
2. Employee record not updated
3. RLS policy preventing access

**Solution**:
1. Check browser console for any errors
2. Verify employee record has `auth_user_id` populated
3. Check Vercel function logs for details

---

## Database Queries for Manual Verification

Use Supabase SQL Editor to verify:

```sql
-- Check 1: Is the default tenant created?
SELECT id, company_name, slug FROM public.tenants 
WHERE id = '00000000-0000-0000-0000-000000000001';
-- Expected: 1 row for default tenant

-- Check 2: Are you in tenant_admins?
SELECT id, tenant_id, auth_user_id, email FROM public.tenant_admins
WHERE email = 'your@email.com';
-- Expected: 1 row with your email

-- Check 3: Are employees assigned to default tenant?
SELECT id, first_name, last_name, tenant_id FROM public.employees
LIMIT 5;
-- Expected: tenant_id = '00000000-0000-0000-0000-000000000001'

-- Check 4: Is the employee auth_user_id populated after invite?
SELECT id, first_name, last_name, auth_user_id FROM public.employees
WHERE first_name = 'John' AND last_name = 'Technician';
-- After invite: auth_user_id should be a UUID (not NULL)
```

---

## Complete Fix Workflow

If everything is broken:

1. **Ensure migrations are applied**
   ```bash
   npx supabase db push
   ```
   Or manually run all migrations in Supabase SQL Editor

2. **Initialize admin**
   ```
   POST /api/setup/admin-init
   ```

3. **Verify with debug endpoint**
   ```
   GET /api/debug/admin-status
   ```

4. **Try inviting employee**
   - Go to `/employees`
   - Click "Invite to Portal"
   - Fill form and submit

5. **Check console logs**
   - Look for "employee-invite:" logs
   - Copy any error messages

6. **Check browser Network tab**
   - Verify POST to `/api/auth/employee-invite` succeeds (200)
   - Check response body for error details

---

## Common Error Messages and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Failed to verify admin status" | Admin not initialized | Call `POST /api/setup/admin-init` |
| "Failed to verify admin status: [details]" | Database error | Check Vercel logs, check DB connection |
| "Failed to establish admin privileges" | Can't create default tenant | Check Supabase database access |
| "Could not verify admin status" | Retry failed | Refresh page and try again |
| "Employee not found" | Employee doesn't exist | Create employee first on `/employees` |
| "Employee not found in your tenant" | Employee in wrong tenant | Verify employee.tenant_id in DB |
| "Employee already has a portal account" | Already invited | Check employees.auth_user_id is populated |

---

## What Was Fixed

**Previous Issue:**
- Employee-invite API tried to query tenant_admins
- If user not found, error message was vague
- Auto-promotion logic was fragile

**New Implementation:**
- `ensureAdminInitialized()` helper function
  - Safely checks and initializes admin
  - Creates default tenant if missing
  - Clear error messages at each step
- Improved logging for debugging
- Debug endpoints to see actual state
- Setup endpoint to manually initialize

---

## Best Practices Going Forward

1. **After fresh admin signup**
   - Auto-initialize completes in `admin-signup` route
   - No manual steps needed

2. **If user exists but needs admin privileges**
   - Call `POST /api/setup/admin-init`
   - Or run migration in Supabase

3. **For testing**
   - Use debug endpoint to verify state
   - Check Vercel logs for detailed errors
   - Use SQL Editor to verify database records

4. **Before production**
   - Remove `/api/debug/admin-status` endpoint
   - Remove or protect `/api/setup/admin-init` endpoint
   - Ensure all migrations have run
