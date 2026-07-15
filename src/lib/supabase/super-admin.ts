import type { PostgrestError, User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SerializedSupabaseError = {
  code: string | null;
  message: string;
  details: string | null;
  hint: string | null;
};

export type SuperAdminAccess = {
  supabaseProjectHostname: string;
  user: User | null;
  userError: SerializedSupabaseError | null;
  rpcResult: boolean | null;
  rpcError: SerializedSupabaseError | null;
  matchingSuperAdminRow: {
    id: string;
    email: string;
    auth_user_id: string;
  } | null;
  matchingSuperAdminRowError: SerializedSupabaseError | null;
};

export type SuperAdminAccessResolution = SuperAdminAccess & {
  canAccess: boolean;
  denied: boolean;
  needsAuth: boolean;
};

function serializeError(error: PostgrestError | Error | null | undefined): SerializedSupabaseError | null {
  if (!error) {
    return null;
  }

  return {
    code: "code" in error ? error.code ?? null : null,
    message: error.message,
    details: "details" in error ? (error.details ?? null) : null,
    hint: "hint" in error ? (error.hint ?? null) : null,
  };
}

function getSupabaseProjectHostname() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return "not configured";
  }

  try {
    return new URL(supabaseUrl).hostname;
  } catch {
    return "invalid URL";
  }
}

export async function requireSuperAdminAccess(): Promise<SuperAdminAccessResolution> {
  const supabase = await createServerSupabaseClient();
  const supabaseProjectHostname = getSupabaseProjectHostname();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  const rpcResult = user ? await supabase.rpc("is_super_admin") : { data: null, error: null };

  const directRowResult = user
    ? await supabase
        .from("super_admins")
        .select("id,email,auth_user_id")
        .eq("auth_user_id", user.id)
        .maybeSingle()
    : { data: null, error: null };

  const rpcError = serializeError(rpcResult.error);
  const matchingSuperAdminRowError = serializeError(directRowResult.error);
  const matchingSuperAdminRow = directRowResult.data
    ? {
        id: directRowResult.data.id,
        email: directRowResult.data.email,
        auth_user_id: directRowResult.data.auth_user_id,
      }
    : null;

  const resolved: SuperAdminAccessResolution = {
    supabaseProjectHostname,
    user,
    userError: serializeError(userError),
    rpcResult: rpcResult.data ?? null,
    rpcError,
    matchingSuperAdminRow,
    matchingSuperAdminRowError,
    canAccess: Boolean(user && rpcResult.error == null && rpcResult.data === true),
    denied: Boolean(user && rpcResult.error == null && rpcResult.data === false),
    needsAuth: !user,
  };

  if (process.env.NODE_ENV === "production" && rpcError) {
    console.error("Super admin RPC error:", {
      supabaseProjectHostname,
      authUserId: user?.id ?? null,
      authUserEmail: user?.email ?? null,
      rpcError,
      matchingSuperAdminRow,
      matchingSuperAdminRowError,
    });
  }

  return resolved;
}
