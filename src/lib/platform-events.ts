export const PLATFORM_EVENT_ALLOWLIST = [
  "homepage_viewed",
  "pricing_viewed",
  "contact_form_submitted",
  "demo_request_submitted",
  "founding_partner_application_submitted",
  "free_trial_clicked",
  "interactive_demo_opened",
  "demo_video_opened",
  "book_demo_clicked",
  "lead_marked_won",
] as const;

export type PlatformEventName = (typeof PLATFORM_EVENT_ALLOWLIST)[number];

export function isPlatformEventName(value: string): value is PlatformEventName {
  return (PLATFORM_EVENT_ALLOWLIST as readonly string[]).includes(value);
}

export const PLATFORM_CONVERSION_EVENTS: readonly PlatformEventName[] = [
  "free_trial_clicked",
  "book_demo_clicked",
  "contact_form_submitted",
  "demo_request_submitted",
  "founding_partner_application_submitted",
  "lead_marked_won",
];