export type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

export function trackAnalyticsEvent(eventName: string, payload: AnalyticsPayload = {}) {
  if (typeof window === "undefined") return;

  const cleanPayload = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );

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
}
