# Environment Variables Guide

Copy `.env.example` to `.env.local` and fill in the required values.

## Supabase

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
  - Find at: https://supabase.com/dashboard → Project Settings → API
  
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous public key
  - Find at: https://supabase.com/dashboard → Project Settings → API

## Stripe (Payment Processing)

### Required for Production
- `STRIPE_SECRET_KEY` - Your Stripe secret key (server-side only)
  - Find at: https://dashboard.stripe.com → Developers → API keys
  - **IMPORTANT: Never expose this in client-side code**
  
- `STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key (client-side safe)
  - Find at: https://dashboard.stripe.com → Developers → API keys
  - Can be exposed to client-side
  
- `STRIPE_WEBHOOK_SECRET` - Your Webhook endpoint secret
  - Create at: https://dashboard.stripe.com → Developers → Webhooks
  - Set up webhook to point to: `YOUR_APP_URL/api/stripe/webhook`
  - Subscribe to event: `checkout.session.completed`

- `NEXT_PUBLIC_APP_URL` - Your application URL (for Stripe redirects)
  - Development: `http://localhost:3000`
  - Production: `https://your-domain.com`

## Maps Routing (Automatic Mileage)

- `MAPBOX_ACCESS_TOKEN` - Mapbox access token used server-side for route mileage and duration
  - Create at: https://account.mapbox.com/access-tokens/
  - Required scopes: `styles:read`, `fonts:read`
  - **IMPORTANT: Never expose this in client-side code**

## How to Set Up Stripe

1. **Create a Stripe Account**
   - https://dashboard.stripe.com

2. **Get Your API Keys**
   - Go to Developers → API keys
   - Copy Secret Key and Publishable Key

3. **Set Up Webhook**
   - Go to Developers → Webhooks
   - Click "Add endpoint"
   - Enter: `YOUR_APP_URL/api/stripe/webhook`
   - Select event: `checkout.session.completed`
   - Copy the webhook signing secret

4. **Update .env.local**
   ```
   STRIPE_SECRET_KEY=sk_test_... (from step 2)
   STRIPE_PUBLISHABLE_KEY=pk_test_... (from step 2)
   STRIPE_WEBHOOK_SECRET=whsec_... (from step 3)
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

## Testing Payments

Use Stripe's test card numbers:
- **Success**: `4242 4242 4242 4242` (no 3D Secure)
- **Requires 3D Secure**: `4000 0027 6000 3184`
- **Declined**: `4000 0000 0000 0002`

Use any future expiration date and any 3-digit CVC.

See more test cards at: https://stripe.com/docs/testing#cards

## Webhook Testing (Local Development)

To test webhooks locally:

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward events: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
4. This will show you the webhook signing secret to use

## Security Notes

- **Never commit `.env.local`** to version control
- **Only `STRIPE_SECRET_KEY` can go in backend** - client-side code should never see it
- Use `NEXT_PUBLIC_` prefix ONLY for values safe to expose
- Store all secrets as environment variables, never hardcoded
- Rotate webhook signing secrets periodically
- Use HTTPS in production
