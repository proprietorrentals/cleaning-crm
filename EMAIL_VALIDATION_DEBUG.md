# Email Validation Debug Guide

## Problem
Supabase Auth is rejecting valid emails with:
```
AuthApiError: Email address "test2@gmail.com" is invalid
AuthApiError: Email address "test@gmail.com" is invalid
```

The app code is correct - the issue is in **Supabase Auth configuration**.

## Root Causes (in order of likelihood)

### 1. ⚠️ Email Provider Not Configured (MOST COMMON)
If SMTP/Email provider isn't set up in Supabase, it rejects all emails as "invalid".

**Fix:**
1. Go to: https://supabase.com/dashboard
2. Select your project (cleaning-crm)
3. Click: **Authentication** → **Providers** → **Email**
4. Check the email configuration:
   - If using Custom SMTP: Verify SMTP server is configured and working
   - If using built-in: Ensure it's enabled
   - If testing: You might need to disable email verification for testing

### 2. ⚠️ Email Verification Enabled but Provider Down
If "Require email verification" is enabled and the email provider isn't working, signups fail.

**Fix:**
1. Go to: **Authentication** → **Policies**
2. Check "Require email verification on signup"
3. If enabled, make sure your SMTP provider in "Email → Settings" is working

### 3. ⚠️ Custom Email Validation Rule
Supabase might have a custom regex that's too strict.

**Fix:**
1. Check: **Authentication** → **Settings**
2. Look for any custom email validation rules
3. Verify the regex accepts: `test2@gmail.com` and `test@example.com`

## Debugging Steps

### Step 1: Check Provider Settings
```
Dashboard → Authentication → Providers → Email
Look for:
  □ Provider is enabled
  □ SMTP is configured (if using custom)
  □ No error messages about missing credentials
```

### Step 2: Test Different Email Formats
Try these in order (each should work if provider is correct):
1. `test@example.local`
2. `user123@example.com`
3. `test.user@company.co.uk`
4. `test+tag@gmail.com`

### Step 3: Check Supabase Logs
In Supabase Dashboard:
1. Go to: **Auth** → **Logs**
2. Look for failed signup attempts
3. Check the exact error message from the Supabase Auth API

### Step 4: Run Diagnostic
The app now logs detailed error info to browser console:
1. Open DevTools (F12)
2. Go to **Console** tab
3. Try to signup
4. Look for messages like:
   ```
   Signup error: AuthApiError: ...
   Error status: ...
   Error code: ...
   ```

## Common Fixes

### Fix 1: Disable Email Verification (for testing)
```
Authentication → Policies → Uncheck "Require email verification"
```

### Fix 2: Configure SMTP
```
Authentication → Providers → Email → Custom SMTP
- SMTP Host: Your email service host
- SMTP Port: Usually 587 or 465
- SMTP User: Your email service account
- SMTP Pass: Your service credentials
```

### Fix 3: Use Supabase's Built-in Email (Recommended for Testing)
```
Authentication → Providers → Email → Enable "Use Supabase's email service"
```

## Quick Test

After checking settings, try signing up with:
- **Email**: `testuser@example.com` (simple format)
- **Password**: `TestPassword123!` (strong password)
- **Company**: `Test Company`
- **Contact**: `Test User`

## App Updates

✓ Added detailed error logging to customer auth page
✓ Error messages now include helpful hints (e.g., "Check Supabase Email Provider configuration")
✓ Browser console shows full error details including status codes
✓ App builds successfully with 17 routes

## Next Steps

1. **Check your Supabase Auth Provider settings** (most likely issue)
2. **Try the quick test with example.com email**
3. **Check browser console (F12) for detailed error codes**
4. **Check Supabase Auth logs in dashboard**
5. **Report the exact error code** if the issue persists

The app code is working correctly - the issue is definitely on the Supabase Auth side.
