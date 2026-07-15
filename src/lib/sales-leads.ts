import { headers } from "next/headers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const SALES_LEAD_SOURCES = [
  "website_contact",
  "demo_request",
  "founding_partner",
  "free_trial",
] as const;

export type SalesLeadSource = (typeof SALES_LEAD_SOURCES)[number];

export type PublicLeadInput = {
  source: SalesLeadSource;
  contactName: string;
  companyName?: string;
  email: string;
  phone?: string;
  employeeCount?: string;
  businessType?: string;
  currentSoftware?: string;
  message?: string;
  foundingPartnerInterest?: boolean;
  honeypot?: string;
};

const DEFAULT_PUBLIC_TENANT_ID = "00000000-0000-0000-0000-000000000001";

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function sanitizeText(value: string, maxLength: number) {
  const normalized = normalizeWhitespace(value)
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "");
  return normalized.slice(0, maxLength);
}

function sanitizeOptional(value: string | undefined, maxLength: number) {
  if (!value) return null;
  const sanitized = sanitizeText(value, maxLength);
  return sanitized.length > 0 ? sanitized : null;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function resolvePublicLeadTenantId() {
  return process.env.PUBLIC_MARKETING_TENANT_ID || DEFAULT_PUBLIC_TENANT_ID;
}

function sourceFromUnknown(raw: string | null | undefined): SalesLeadSource {
  if (!raw) return "website_contact";
  const normalized = raw.trim().toLowerCase();
  if (normalized === "demo_request") return "demo_request";
  if (normalized === "founding_partner") return "founding_partner";
  if (normalized === "free_trial") return "free_trial";
  return "website_contact";
}

function getClientIpHeaderValue(rawHeader: string | null) {
  if (!rawHeader) return "unknown";
  const first = rawHeader.split(",")[0]?.trim();
  return first || "unknown";
}

export function parseLeadSource(raw: string | null | undefined) {
  return sourceFromUnknown(raw);
}

export async function capturePublicSalesLead(input: PublicLeadInput) {
  const contactName = sanitizeText(input.contactName ?? "", 160);
  const email = sanitizeText((input.email ?? "").toLowerCase(), 320);
  const honeypot = normalizeWhitespace(input.honeypot ?? "");

  if (honeypot) {
    return { accepted: true, duplicate: true, spamBlocked: true };
  }

  if (!contactName) {
    throw new Error("Name is required.");
  }
  if (!email) {
    throw new Error("Email is required.");
  }
  if (!isValidEmail(email)) {
    throw new Error("Invalid email address.");
  }

  const supabase = createAdminSupabaseClient();
  const tenantId = resolvePublicLeadTenantId();

  const now = new Date();
  const duplicateWindowStart = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const rateWindowStart = new Date(now.getTime() - 2 * 60 * 1000).toISOString();

  const hdrs = await headers();
  const ipAddress = getClientIpHeaderValue(hdrs.get("x-forwarded-for"));

  const { data: recentDuplicates, error: duplicateCheckError } = await supabase
    .from("sales_leads")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("source", input.source)
    .eq("email", email)
    .gte("created_at", duplicateWindowStart)
    .limit(1);

  if (duplicateCheckError) {
    throw new Error(`Could not validate duplicate lead submission: ${duplicateCheckError.message}`);
  }

  if ((recentDuplicates ?? []).length > 0) {
    return { accepted: true, duplicate: true, spamBlocked: false };
  }

  const { count: recentEmailCount, error: rateEmailError } = await supabase
    .from("sales_leads")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("email", email)
    .gte("created_at", rateWindowStart);

  if (rateEmailError) {
    throw new Error(`Could not enforce lead submission rate limit: ${rateEmailError.message}`);
  }

  if ((recentEmailCount ?? 0) >= 3) {
    throw new Error("Submission blocked. Please wait and try again.");
  }

  const metadataMessage = sanitizeOptional(input.message, 3000);
  const messageWithSource = metadataMessage
    ? `${metadataMessage}\n\n[submission_ip=${ipAddress}]`
    : `[submission_ip=${ipAddress}]`;

  const { data: insertedLead, error: insertError } = await supabase
    .from("sales_leads")
    .insert({
      tenant_id: tenantId,
      contact_name: contactName,
      company_name: sanitizeOptional(input.companyName, 200),
      email,
      phone: sanitizeOptional(input.phone, 80),
      employee_count: sanitizeOptional(input.employeeCount, 80),
      business_type: sanitizeOptional(input.businessType, 120),
      current_software: sanitizeOptional(input.currentSoftware, 120),
      message: messageWithSource,
      source: input.source,
      status: "new",
      founding_partner_interest: Boolean(input.foundingPartnerInterest),
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(`Failed to create sales lead: ${insertError.message}`);
  }

  return { accepted: true, duplicate: false, spamBlocked: false, id: insertedLead.id };
}
