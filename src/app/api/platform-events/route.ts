import { NextResponse } from "next/server";
import { isPlatformEventName } from "@/lib/platform-events";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type PlatformEventBody = {
  eventName?: string;
  payload?: Record<string, string | number | boolean | null | undefined>;
  pagePath?: string;
  source?: string;
  anonymousId?: string;
};

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_EVENTS = 120;
const DUPLICATE_WINDOW_SECONDS = 8;

function safeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/[\u0000-\u001F\u007F]/g, "");
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function sanitizePayload(payload: PlatformEventBody["payload"]): Record<string, string | number | boolean | null> {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const blockedKeyPattern = /(email|phone|name|address|ssn|token|password|secret|company)/i;
  const cleanedEntries = Object.entries(payload)
    .filter(([key]) => !blockedKeyPattern.test(key))
    .slice(0, 12)
    .map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.slice(0, 160)] as const;
      }

      if (typeof value === "number" || typeof value === "boolean" || value === null) {
        return [key, value] as const;
      }

      return [key, null] as const;
    });

  return Object.fromEntries(cleanedEntries);
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (!forwardedFor) return "unknown";
  const first = forwardedFor.split(",")[0]?.trim();
  return first || "unknown";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PlatformEventBody;
    const eventName = safeText(body.eventName, 80);

    if (!eventName || !isPlatformEventName(eventName)) {
      return NextResponse.json({ ok: false, error: "Event is not allowlisted." }, { status: 400 });
    }

    const pagePath = safeText(body.pagePath, 260);
    const eventSource = safeText(body.source, 64) ?? "web";
    const anonymousId = safeText(body.anonymousId, 100) ?? getClientIp(request);
    const userAgent = safeText(request.headers.get("user-agent"), 300);
    const payload = sanitizePayload(body.payload);

    const supabase = createAdminSupabaseClient();
    const now = Date.now();
    const rateLimitStart = new Date(now - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();
    const duplicateStart = new Date(now - DUPLICATE_WINDOW_SECONDS * 1000).toISOString();

    const { count: recentCount, error: rateLimitError } = await supabase
      .from("platform_events")
      .select("id", { count: "exact", head: true })
      .eq("anonymous_id", anonymousId)
      .gte("created_at", rateLimitStart);

    if (rateLimitError) {
      throw new Error(`Failed rate limit check: ${rateLimitError.message}`);
    }

    if ((recentCount ?? 0) > RATE_LIMIT_MAX_EVENTS) {
      return NextResponse.json({ ok: false, error: "Rate limit exceeded." }, { status: 429 });
    }

    const { data: duplicateRows, error: duplicateError } = await supabase
      .from("platform_events")
      .select("id")
      .eq("event_name", eventName)
      .eq("anonymous_id", anonymousId)
      .eq("page_path", pagePath)
      .gte("created_at", duplicateStart)
      .limit(1);

    if (duplicateError) {
      throw new Error(`Failed duplicate check: ${duplicateError.message}`);
    }

    if ((duplicateRows ?? []).length > 0) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const { error: insertError } = await supabase.from("platform_events").insert({
      event_name: eventName,
      event_source: eventSource,
      page_path: pagePath,
      metadata: payload,
      anonymous_id: anonymousId,
      user_agent: userAgent,
    });

    if (insertError) {
      throw new Error(`Failed to write platform event: ${insertError.message}`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}