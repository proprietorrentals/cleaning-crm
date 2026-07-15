"use server";

import { contactSchema } from "@/app/contact/contact-schema";
import type { ContactActionState } from "@/app/contact/form-state";
import { capturePublicSalesLead, parseLeadSource } from "@/lib/sales-leads";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function isSpanish(value: string) {
  return value === "es";
}

function messageCatalog(spanish: boolean) {
  return {
    fixHighlighted: spanish ? "Corrige los campos resaltados." : "Please correct the highlighted fields.",
    submitSuccess: spanish
      ? "Gracias. Recibimos tu solicitud de demo y nuestro equipo se comunicara pronto."
      : "Thanks. Your demo request has been received and our team will reach out soon.",
    serverError: spanish
      ? "Ocurrio un error del servidor al enviar tu solicitud."
      : "A server error occurred while submitting your request.",
  };
}

export async function submitContactForm(
  _prevState: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const getString = (key: string, fallback = "") => {
    const value = formData.get(key);
    return typeof value === "string" ? value : fallback;
  };

  const rawInput = {
    name: getString("name"),
    company: getString("company"),
    email: getString("email"),
    phone: getString("phone"),
    employeeCount: getString("employeeCount"),
    businessType: getString("businessType"),
    message: getString("message"),
    leadSource: getString("leadSource") || undefined,
    website: getString("website"),
    language: getString("language", "en"),
  };

  const spanish = isSpanish(rawInput.language);
  const copy = messageCatalog(spanish);

  const parsed = contactSchema.safeParse(rawInput);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }

    return {
      success: false,
      message: copy.fixHighlighted,
      fieldErrors,
    };
  }

  const input = parsed.data;
  const leadSource = parseLeadSource(input.leadSource);

  try {
    await capturePublicSalesLead({
      source: leadSource,
      contactName: input.name,
      companyName: input.company,
      email: input.email,
      phone: input.phone,
      employeeCount: input.employeeCount,
      businessType: input.businessType,
      currentSoftware: "",
      message: input.message,
      foundingPartnerInterest: leadSource === "founding_partner",
      honeypot: input.website,
    });

    // Keep legacy demo request intake so existing workflows remain intact.
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.from("demo_requests").insert({
      name: input.name,
      company: input.company,
      email: input.email,
      phone: input.phone || null,
      employee_count: input.employeeCount,
      business_type: input.businessType,
      message: input.message,
      source_page: `/contact?leadSource=${leadSource}`,
    });

    if (error) {
      console.warn("submitContactForm legacy demo_requests insert warning:", error.message);
    }

    return {
      success: true,
      message: copy.submitSuccess,
    };
  } catch (error) {
    console.error("submitContactForm unexpected error:", error);
    return {
      success: false,
      message:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? `${copy.serverError} (${error.message})`
          : copy.serverError,
    };
  }
}
