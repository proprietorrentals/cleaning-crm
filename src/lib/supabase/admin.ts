import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client.
 * Use ONLY in server-side API routes — never in client or middleware code.
 * Bypasses RLS, so all operations run as the database owner.
 *
 * REQUIRES:
 * - NEXT_PUBLIC_SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key (secret - server-side only)
 *
 * These must be set in:
 * - .env.local (for local development)
 * - Vercel project settings (for production)
 */
export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Log (safely - without exposing keys) whether credentials exist
  const hasUrl = !!url;
  const hasKey = !!key;
  
  if (!hasUrl || !hasKey) {
    const missing = [];
    if (!hasUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!hasKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    
    const errorMsg = `Missing required environment variables for admin operations: ${missing.join(", ")}`;
    console.error("createAdminSupabaseClient:", errorMsg);
    throw new Error(errorMsg);
  }

  // Validate key format (service role keys start with 'eyJ' or are UUID-like)
  if (typeof key !== "string" || key.length < 20) {
    console.error("createAdminSupabaseClient: Service role key appears invalid (too short)");
    throw new Error("SUPABASE_SERVICE_ROLE_KEY appears to be invalid (too short)");
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
