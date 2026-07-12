# Environment Variables Setup

This guide explains how to configure environment variables for the cleaning CRM application.

## Quick Start

### Local Development (.env.local)

1. Create `.env.local` in the project root
2. Add these variables (replace with YOUR actual values):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxx
STRIPE_SECRET_KEY=sk_test_xxxx
MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Vercel Production

Set these environment variables in Vercel project settings:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
MAPBOX_ACCESS_TOKEN
NEXT_PUBLIC_APP_URL
```

---

## Required Variables Explained

### Supabase Configuration

#### `NEXT_PUBLIC_SUPABASE_URL`
- **Type**: Public (safe to expose in browser)
- **Purpose**: Supabase project URL
- **Where to find**:
  1. Go to https://app.supabase.com
  2. Select your project
  3. Click **Settings** → **API**
  4. Copy the **Project URL**
- **Example**: `https://gnkypmonqlkibaisfgnp.supabase.co`

#### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Type**: Public (safe to expose in browser)
- **Purpose**: Anonymous/publishable key for client-side operations
- **Where to find**:
  1. Go to https://app.supabase.com
  2. Select your project
  3. Click **Settings** → **API**
  4. Copy the **Anon public** key (starts with `sb_publishable_`)
- **Example**: `sb_publishable_w-se2cS_qcYA1WYOk5gexQ__XE9gbeZ`

⚠️ **NOTE**: Do NOT use the old `eyJ` format anon keys. They are deprecated. Use `sb_publishable_` keys.

#### `SUPABASE_SERVICE_ROLE_KEY`
- **Type**: Secret (NEVER expose in browser)
- **Purpose**: Service role key for server-side admin operations
- **Where to find**:
  1. Go to https://app.supabase.com
  2. Select your project
  3. Click **Settings** → **API**
  4. Copy the **Service role secret** key
- **IMPORTANT**: 
  - This key bypasses RLS policies
  - Only use in server-side code (API routes, server functions)
  - Never commit to git (use .gitignore)
  - Never expose in client-side code
- **In .env.local**: ✅ OK to add (git-ignored)
- **In Vercel**: ✅ Add as environment variable
- **In client code**: ❌ NEVER use

---

## Where to Get Keys from Supabase

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Sign in with your account

2. **Select Your Project**
   - Click on the project you created for this app

3. **Navigate to API Settings**
   - Click **Settings** in left sidebar
   - Click **API** tab

4. **Copy Your Keys**
   - **Project URL**: Copy the URL at the top
   - **Anon Key**: Look for `Anon public`
   - **Service Role**: Look for `Service role secret`

---

## Stripe Configuration (Optional)

If you're using Stripe for payments:

### `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- **Type**: Public (safe to expose in browser)
- **Where to find**: https://dashboard.stripe.com/apikeys
- **Copy**: "Publishable key" (starts with `pk_`)

### `STRIPE_SECRET_KEY`
- **Type**: Secret (NEVER expose)
- **Where to find**: https://dashboard.stripe.com/apikeys
- **Copy**: "Secret key" (starts with `sk_`)

---

## Maps Configuration (Required for Automatic Mileage)

### `MAPBOX_ACCESS_TOKEN`
- **Type**: Secret (server-only usage)
- **Purpose**: Calculates route distance and estimated drive duration for mileage requests
- **Where to find**:
   1. Go to https://account.mapbox.com/access-tokens/
   2. Create a token for the application
   3. Copy the token value
- **Security**:
   - Add to `.env.local` and deployment environment settings only
   - Never expose in browser code

---

## .env.local vs .env.production

### .env.local (Local Development)
- Located in project root
- Git-ignored (in .gitignore)
- Used by `npm run dev`
- Can contain secrets safely

### Production (Vercel)
- Set in Vercel project settings
- Never hardcoded
- Used by deployed application

---

## Verification

### Check if Variables are Set (Safe Logging)

The application logs whether variables are set WITHOUT exposing their values:

```
createAdminSupabaseClient: Missing required environment variables: SUPABASE_SERVICE_ROLE_KEY
```

or

```
createServerSupabaseClient: Supabase client initialized
```

### Debug Endpoint

After setting environment variables, check the status:

```
GET /api/debug/admin-status
```

Should return:
```json
{
  "status": "debug_info",
  "current_user": { "id": "...", "email": "..." },
  "admin_check": { "in_tenant_admins": true }
}
```

If it shows an error about missing keys, verify all variables are set in Vercel.

---

## Troubleshooting

### Error: "Missing required environment variables: SUPABASE_SERVICE_ROLE_KEY"

**Solution**: 
1. Check `.env.local` has the key
2. For Vercel: Go to project settings → Environment Variables
3. Add `SUPABASE_SERVICE_ROLE_KEY` with the service role secret value
4. Redeploy the project

### Error: "Invalid API key"

**Solution**:
1. Verify you copied the correct key (not truncated)
2. Try getting a new key from Supabase
3. Ensure the key is for the correct Supabase project
4. Check that you're using `Service role secret`, not "Anon public"

### Error: "Unauthorized" when using anon key

**Solution**:
1. This is normal - some operations require service role
2. Make sure you're using the correct key for each operation:
   - Client code: Use `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Server code: Use `SUPABASE_SERVICE_ROLE_KEY`

---

## Security Best Practices

1. ✅ **DO:**
   - Store secrets in .env.local and Vercel only
   - Use service role key only on server
   - Use anon key in client code
   - Prefix public keys with `NEXT_PUBLIC_`

2. ❌ **DON'T:**
   - Commit `.env.local` to git (it's in .gitignore)
   - Expose service role key in browser
   - Use old `eyJ` format anon keys
   - Log secret values to console
   - Share keys in Slack/email

---

## Environment Variables Checklist

- [ ] `.env.local` created in project root
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set and correct
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set (format: `sb_publishable_...`)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (service role secret)
- [ ] Vercel environment variables configured
- [ ] Build succeeds locally: `npm run build`
- [ ] Vercel deployment succeeds
- [ ] Debug endpoint returns success: `GET /api/debug/admin-status`

---

## Next Steps

After setting environment variables:

1. Run locally: `npm run dev`
2. Test admin setup: `POST /api/setup/admin-init`
3. Check status: `GET /api/debug/admin-status`
4. Try inviting employee: Go to `/employees` → "Invite to Portal"

If you're still seeing errors, check the Vercel function logs in your project dashboard.
