"use server";

import { capturePublicSalesLead, parseLeadSource } from "@/lib/sales-leads";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { ContactActionState } from "@/app/contact/form-state";

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function trimValue(value: FormDataEntryValue | null) {
  return (typeof value === "string" ? value : "").trim();
}

function isSpanish(value: string) {
  return value === "es";
}

function messageCatalog(spanish: boolean) {
  return {
    nameRequired: spanish ? "El nombre es obligatorio." : "Name is required.",
    companyRequired: spanish ? "La empresa es obligatoria." : "Company is required.",
    emailRequired: spanish ? "El correo es obligatorio." : "Email is required.",
    emailInvalid: spanish ? "Ingresa un correo valido." : "Enter a valid email address.",
    employeeCountRequired: spanish ? "El numero de empleados es obligatorio." : "Number of employees is required.",
    businessTypeRequired: spanish ? "El tipo de negocio es obligatorio." : "Business type is required.",
    messageRequired: spanish ? "El mensaje es obligatorio." : "Message is required.",
    messageShort: spanish
      ? "Comparte un poco mas de detalle (al menos 10 caracteres)."
      : "Please share a bit more detail (at least 10 characters).",
    fixHighlighted: spanish ? "Corrige los campos resaltados." : "Please correct the highlighted fields.",
    submitError: spanish
      ? "No pudimos enviar tu solicitud ahora. Intentalo de nuevo en unos minutos."
      : "We could not submit your request right now. Please try again shortly.",
    submitSuccess: spanish
      ? "Gracias. Recibimos tu solicitud de demo y nuestro equipo se comunicara pronto."
      : "Thanks. Your demo request has been received and our team will reach out soon.",
    serverError: spanish
      ? "Ocurrio un error del servidor al enviar tu solicitud."
      : "A server error occurred while submitting your request.",
  };
}

export async function submitDemoRequest(
  _prevState: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const language = trimValue(formData.get("language"));
  const spanish = isSpanish(language);
  const copy = messageCatalog(spanish);

  const name = trimValue(formData.get("name"));
  const company = trimValue(formData.get("company"));
  const email = trimValue(formData.get("email"));
  const phone = trimValue(formData.get("phone"));
  const employeeCount = trimValue(formData.get("employeeCount"));
  const businessType = trimValue(formData.get("businessType"));
  const message = trimValue(formData.get("message"));
  const leadSource = parseLeadSource(trimValue(formData.get("leadSource")));
  const website = trimValue(formData.get("website"));

  const fieldErrors: Record<string, string> = {};

  if (!name) fieldErrors.name = copy.nameRequired;
  if (!company) fieldErrors.company = copy.companyRequired;
  if (!email) {
    fieldErrors.email = copy.emailRequired;
  } else if (!validateEmail(email)) {
    fieldErrors.email = copy.emailInvalid;
  }
  if (!employeeCount) fieldErrors.employeeCount = copy.employeeCountRequired;
  if (!businessType) fieldErrors.businessType = copy.businessTypeRequired;
  if (!message) {
    fieldErrors.message = copy.messageRequired;
  } else if (message.length < 10) {
    fieldErrors.message = copy.messageShort;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      message: copy.fixHighlighted,
      fieldErrors,
    };
  }

  try {
    await capturePublicSalesLead({
      source: leadSource,
      contactName: name,
      companyName: company,
      email,
      phone,
      employeeCount,
      businessType,
      currentSoftware: "",
      message,
      foundingPartnerInterest: leadSource === "founding_partner",
      honeypot: website,
    });

    // Keep legacy demo request intake so existing workflows remain intact.
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.from("demo_requests").insert({
      name,
      company,
      email,
      phone: phone || null,
      employee_count: employeeCount,
      business_type: businessType,
      message,
      source_page: `/contact?leadSource=${leadSource}`,
    });

    if (error) {
      console.warn("submitDemoRequest legacy demo_requests insert warning:", error.message);
    }

    return {
      success: true,
      message: copy.submitSuccess,
    };
  } catch (error) {
    console.error("submitDemoRequest unexpected error:", error);
    return {
      success: false,
      message:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? `${copy.serverError} (${error.message})`
          : copy.serverError,
    };
  }
}
