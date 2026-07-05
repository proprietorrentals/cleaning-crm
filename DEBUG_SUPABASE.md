# Supabase Connection Debugging Checklist

If you're getting "Failed to fetch" errors when trying to add customers, check the following:

## 1. Environment Variables (.env.local)
✓ **MUST** have real Supabase credentials (not placeholders)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... (your actual anon key)
```

**How to find your credentials:**
- Go to https://supabase.com/dashboard
- Click your project
- Go to **Settings** → **API**
- Copy the **Project URL** and paste into `NEXT_PUBLIC_SUPABASE_URL`
- Copy the **anon public key** and paste into `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **IMPORTANT:** Restart the dev server after updating `.env.local` (`npm run dev`)

## 2. Supabase Tables
✓ The `customers` table must exist

Run this SQL in your Supabase dashboard (SQL Editor):
```sql
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  phone text,
  email text not null,
  address text,
  building_size text,
  cleaning_frequency text,
  notes text,
  created_at timestamptz default now()
);
```

## 3. Row Level Security (RLS)
✓ **Disable RLS** on the `customers` table to start with

Steps:
1. Go to **Authentication** → **Policies** in Supabase
2. Click on the `customers` table
3. Toggle **Enable RLS** to **OFF** (or keep it ON and add a policy that allows INSERT/SELECT for authenticated users)

**If you want to keep RLS enabled**, add this policy:
```sql
CREATE POLICY "Allow all operations for authenticated users"
ON public.customers
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
```

## 4. Authentication
✓ Email/Password authentication should be enabled

Steps:
1. In Supabase, go to **Authentication** → **Providers**
2. Make sure **Email** provider is enabled
3. If you want to test without login, disable RLS (see step 3)

## 5. Network & CORS
✓ Supabase should automatically handle CORS for browser requests

If you're still seeing network errors:
- Check browser console for exact error (look for detailed error messages)
- The app now shows detailed Supabase errors on screen in the modal

## 6. Checking Errors in Browser

When you click "Add Customer", check two places:
1. **Browser Console** (F12 or Ctrl+Shift+I) → **Console tab**
   - Look for "Insert response", "Insert error", or "Fetch error" logs
   - These contain full error details

2. **Modal Error Message**
   - The modal will display the exact Supabase error message
   - Look for hints like "permission denied", "relation does not exist", "invalid token"

## Common Error Messages & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `relation "customers" does not exist` | Table not created | Run the SQL to create the `customers` table |
| `permission denied for schema public` | RLS blocking anonymous access | Disable RLS or add a policy |
| `invalid token` | Wrong anon key or not set | Update `.env.local` with correct key |
| `Failed to fetch` (no detail) | Network/CORS issue | Check Supabase URL is correct in `.env.local` |
| `unauthorized` | Not authenticated | Disable RLS or add auth policy |

## 7. Quick Test

After making changes:
1. Update `.env.local` with real credentials
2. Restart dev server: `npm run dev`
3. Refresh the page (Ctrl+R)
4. Click "+ Add Customer"
5. Fill in: Company Name, Contact Name, Email
6. Click "Add Customer"
7. Watch the modal for error/success message
8. Check browser console for detailed logs

If still failing, check the exact error message displayed in the modal and browser console.
