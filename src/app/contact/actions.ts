"use server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type ContactActionState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

const initialState: ContactActionState = {
  success: false,
  message: "",
};

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function trimValue(value: FormDataEntryValue | null) {
  return (typeof value === "string" ? value : "").trim();
}

export async function submitDemoRequest(
  _prevState: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const name = trimValue(formData.get("name"));
  const company = trimValue(formData.get("company"));
  const email = trimValue(formData.get("email"));
  const phone = trimValue(formData.get("phone"));
  const employeeCount = trimValue(formData.get("employeeCount"));
  const businessType = trimValue(formData.get("businessType"));
  const message = trimValue(formData.get("message"));

  const fieldErrors: Record<string, string> = {};

  if (!name) fieldErrors.name = "Name is required.";
  if (!company) fieldErrors.company = "Company is required.";
  if (!email) {
    fieldErrors.email = "Email is required.";
  } else if (!validateEmail(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }
  if (!employeeCount) fieldErrors.employeeCount = "Number of employees is required.";
  if (!businessType) fieldErrors.businessType = "Business type is required.";
  if (!message) {
    fieldErrors.message = "Message is required.";
  } else if (message.length < 10) {
    fieldErrors.message = "Please share a bit more detail (at least 10 characters).";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  try {
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.from("demo_requests").insert({
      name,
      company,
      email,
      phone: phone || null,
      employee_count: employeeCount,
      business_type: businessType,
      message,
      source_page: "/contact",
    });

    if (error) {
      console.error("submitDemoRequest insert error:", error.message);
      return {
        success: false,
        message: "We could not submit your request right now. Please try again shortly.",
      };
    }

    return {
      success: true,
      message: "Thanks. Your demo request has been received and our team will reach out soon.",
    };
  } catch (error) {
    console.error("submitDemoRequest unexpected error:", error);
    return {
      success: false,
      message: "A server error occurred while submitting your request.",
    };
  }
}

export const contactInitialState = initialState;
