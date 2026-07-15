import { isPlatformEventName } from "@/lib/platform-events";

export type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

const recentEventTimestamps = new Map<string, number>();
const DUPLICATE_WINDOW_MS = 1200;

function getAnonymousId() {
  if (typeof window === "undefined") return "server";

  const existing = window.sessionStorage.getItem("serviceos_anon_id");
  if (existing) return existing;

  const nextId = `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  window.sessionStorage.setItem("serviceos_anon_id", nextId);
  return nextId;
}

function sanitizePayload(payload: AnalyticsPayload) {
  const blockedKeyPattern = /(email|phone|name|address|token|password|secret|company)/i;
  return Object.fromEntries(
    Object.entries(payload)
      .filter(([key, value]) => value !== undefined && !blockedKeyPattern.test(key))
      .slice(0, 12)
      .map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 160) : value]),
  );
}

function shouldSkipDuplicate(eventName: string, pagePath: string) {
  const key = `${eventName}|${pagePath}`;
  const now = Date.now();
  const previous = recentEventTimestamps.get(key);

  recentEventTimestamps.set(key, now);
  if (!previous) return false;
  return now - previous <= DUPLICATE_WINDOW_MS;
}

export function trackAnalyticsEvent(eventName: string, payload: AnalyticsPayload = {}) {
  if (typeof window === "undefined") return;

  const cleanPayload = sanitizePayload(payload);

  const gtagFn = (window as typeof window & { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtagFn === "function") {
    gtagFn("event", eventName, cleanPayload);
  }

  const dataLayer = (window as typeof window & { dataLayer?: unknown[] }).dataLayer;
  if (Array.isArray(dataLayer)) {
    dataLayer.push({ event: eventName, ...cleanPayload });
  }

  // Internal hook for existing listeners without introducing a new analytics vendor.
  window.dispatchEvent(
    new CustomEvent("serviceos.analytics", {
      detail: {
        eventName,
        payload: cleanPayload,
      },
    }),
  );

  if (!isPlatformEventName(eventName)) {
    return;
  }

  const pagePath = `${window.location.pathname}${window.location.search}`;
  if (shouldSkipDuplicate(eventName, pagePath)) {
    return;
  }

  void fetch("/api/platform-events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      eventName,
      payload: cleanPayload,
      pagePath,
      source: "web",
      anonymousId: getAnonymousId(),
    }),
    keepalive: true,
  });
}
