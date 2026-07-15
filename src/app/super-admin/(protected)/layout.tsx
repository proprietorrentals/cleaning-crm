import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ProtectedSuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.info("super-admin protected layout", {
    currentPath: "/super-admin/(protected)",
    reason: user ? "authenticated-user-present" : "middleware-should-have-handled-unauthenticated-user",
    userPresent: Boolean(user),
  });

  return children;
}
