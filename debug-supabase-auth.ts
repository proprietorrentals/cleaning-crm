/**
 * Supabase Auth Diagnostic Script
 * Run this to check your Supabase Auth configuration
 */

import { createClient } from "@/lib/supabase/client";

async function diagnoseSupabaseAuth() {
  const supabase = createClient();

  console.log("🔍 Supabase Auth Configuration Diagnostic");
  console.log("=========================================\n");

  // Get current session
  const { data: { session } } = await supabase.auth.getSession();
  console.log("Current Session:", session ? "✓ Logged in" : "✗ Not logged in");

  // Try signup with valid email
  console.log("\n📧 Testing Email Validation...");
  console.log("Attempting signup with: test-debug@example.com");

  const { data, error } = await supabase.auth.signUp({
    email: "test-debug@example.com",
    password: "TestDebugPassword123!",
    options: {
      data: {
        company_name: "Debug Test",
        contact_name: "Test User",
      },
    },
  });

  if (error) {
    console.log("❌ Error:", error.message);
    console.log("Error Code:", error.status);
    console.log("Error Type:", error.name);
    
    if (error.message.includes("invalid")) {
      console.log("\n⚠️  Email validation is FAILING");
      console.log("Possible causes:");
      console.log("1. SMTP email provider not configured in Supabase");
      console.log("2. Custom email validation regex is too strict");
      console.log("3. Email verification is required but provider is down");
    }
  } else {
    console.log("✓ Signup successful!");
    console.log("User ID:", data.user?.id);
  }

  console.log("\n📋 Configuration Checklist:");
  console.log("- [ ] Go to Supabase Dashboard");
  console.log("- [ ] Check Authentication → Providers → Email");
  console.log("- [ ] Verify SMTP is configured or disabled");
  console.log("- [ ] Check for custom email validation rules");
  console.log("- [ ] Verify 'Require email verification' setting");
}

// Run if executed directly
if (require.main === module) {
  diagnoseSupabaseAuth().catch(console.error);
}

export { diagnoseSupabaseAuth };
