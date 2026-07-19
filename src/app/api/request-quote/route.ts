import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildDuplicateLookupTokens,
  type DuplicateSignal,
  type QualificationResult,
  qualifyMarketplaceLead,
} from "@/lib/lead-marketplace/qualification";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const MAX_PHOTO_COUNT = 3;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_BUCKET = "marketplace-lead-photos";

type RequestQuoteFailureStage =
  | "VALIDATION_FAILED"
  | "PHOTO_UPLOAD_FAILED"
  | "QUALIFICATION_FAILED"
  | "DUPLICATE_CHECK_FAILED"
  | "DATABASE_WRITE_FAILED"
  | "HISTORY_WRITE_FAILED";

const quoteLeadSchema = z.object({
  businessName: z.string().trim().min(2).max(200),
  contactName: z.string().trim().min(2).max(160),
  email: z.email().trim().max(320),
  phone: z.string().trim().min(7).max(80),
  address: z.string().trim().min(5).max(240),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(50),
  zipCode: z.string().trim().min(3).max(20),
  propertyType: z.string().trim().min(2).max(120),
  squareFootage: z.coerce.number().int().min(100).max(10000000),
  cleaningFrequency: z.string().trim().min(2).max(120),
  serviceRequested: z.string().trim().min(2).max(160),
  budget: z.string().trim().max(120).optional(),
  preferredStartDate: z.iso.date(),
  notes: z.string().trim().max(4000).optional(),
  website: z.string().trim().max(200).optional(),
});

function cleanText(value: string, maxLength: number) {
  return value
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);
}

function cleanOptional(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = cleanText(value, maxLength);
  return cleaned.length > 0 ? cleaned : null;
}

function resolveFileExtension(fileName: string, mimeType: string) {
  const byMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  if (byMime[mimeType]) {
    return byMime[mimeType];
  }

  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext && ["jpg", "jpeg", "png", "webp"].includes(ext)) {
    return ext === "jpeg" ? "jpg" : ext;
  }

  return "bin";
}

async function findDuplicateSignals(params: {
  businessName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
}) {
  const supabase = createAdminSupabaseClient();
  const tokens = buildDuplicateLookupTokens(params);

  const [
    emailMatches,
    phoneMatches,
    addressBusinessMatches,
    businessCityMatches,
  ] = await Promise.all([
    supabase
      .from("marketplace_leads")
      .select("lead_id,created_at,email")
      .eq("email", tokens.email)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("marketplace_leads")
      .select("lead_id,created_at,phone")
      .eq("phone", params.phone)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("marketplace_leads")
      .select("lead_id,created_at,address,business_name")
      .eq("address", params.address)
      .eq("business_name", params.businessName)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("marketplace_leads")
      .select("lead_id,created_at,business_name,city")
      .eq("business_name", params.businessName)
      .eq("city", params.city)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const errors = [
    emailMatches.error,
    phoneMatches.error,
    addressBusinessMatches.error,
    businessCityMatches.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw new Error(
      `Failed to evaluate duplicate signals: ${errors.map((err) => err?.message).join(" | ")}`,
    );
  }

  const signals: DuplicateSignal[] = [];

  for (const row of emailMatches.data ?? []) {
    signals.push({
      leadId: row.lead_id,
      signalType: "email",
      matchedValue: row.email,
      createdAt: row.created_at,
    });
  }

  for (const row of phoneMatches.data ?? []) {
    signals.push({
      leadId: row.lead_id,
      signalType: "phone",
      matchedValue: row.phone,
      createdAt: row.created_at,
    });
  }

  for (const row of addressBusinessMatches.data ?? []) {
    signals.push({
      leadId: row.lead_id,
      signalType: "address_business",
      matchedValue: `${row.address} | ${row.business_name}`,
      createdAt: row.created_at,
    });
  }

  for (const row of businessCityMatches.data ?? []) {
    signals.push({
      leadId: row.lead_id,
      signalType: "business_city",
      matchedValue: `${row.business_name} | ${row.city}`,
      createdAt: row.created_at,
    });
  }

  return signals;
}

async function uploadLeadPhotos(files: File[]) {
  if (files.length === 0) {
    return [] as string[];
  }

  const supabase = createAdminSupabaseClient();
  const urls: string[] = [];

  for (const file of files) {
    const extension = resolveFileExtension(file.name, file.type);
    const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, fileBuffer, {
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });

    if (uploadError) {
      throw new Error(`Photo upload failed: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return urls;
}

function failureResponse(stage: RequestQuoteFailureStage, error: unknown) {
  console.error("request-quote failure", {
    stage,
    message: error instanceof Error ? error.message : String(error),
  });

  return NextResponse.json(
    {
      ok: false,
      error: "Could not submit quote request.",
      stage,
    },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const parsed = quoteLeadSchema.safeParse({
      businessName: formData.get("businessName"),
      contactName: formData.get("contactName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      address: formData.get("address"),
      city: formData.get("city"),
      state: formData.get("state"),
      zipCode: formData.get("zipCode"),
      propertyType: formData.get("propertyType"),
      squareFootage: formData.get("squareFootage"),
      cleaningFrequency: formData.get("cleaningFrequency"),
      serviceRequested: formData.get("serviceRequested"),
      budget: formData.get("budget"),
      preferredStartDate: formData.get("preferredStartDate"),
      notes: formData.get("notes"),
      website: formData.get("website"),
    });

    if (!parsed.success) {
      return failureResponse("VALIDATION_FAILED", parsed.error);
    }

    if (parsed.data.website) {
      return NextResponse.json({ ok: true, spamBlocked: true });
    }

    const photoFiles = formData
      .getAll("photos")
      .filter((entry): entry is File => entry instanceof File)
      .filter((file) => file.size > 0);

    if (photoFiles.length > MAX_PHOTO_COUNT) {
      return failureResponse(
        "PHOTO_UPLOAD_FAILED",
        new Error(`Upload up to ${MAX_PHOTO_COUNT} photos.`),
      );
    }

    for (const photo of photoFiles) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type)) {
        return failureResponse(
          "PHOTO_UPLOAD_FAILED",
          new Error("Photos must be JPG, PNG, or WEBP."),
        );
      }

      if (photo.size > MAX_PHOTO_BYTES) {
        return failureResponse(
          "PHOTO_UPLOAD_FAILED",
          new Error("Each photo must be 5MB or smaller."),
        );
      }
    }

    const cleanInput = {
      businessName: cleanText(parsed.data.businessName, 200),
      contactName: cleanText(parsed.data.contactName, 160),
      email: cleanText(parsed.data.email.toLowerCase(), 320),
      phone: cleanText(parsed.data.phone, 80),
      address: cleanText(parsed.data.address, 240),
      city: cleanText(parsed.data.city, 100),
      state: cleanText(parsed.data.state, 50),
      zipCode: cleanText(parsed.data.zipCode, 20),
      propertyType: cleanText(parsed.data.propertyType, 120),
      squareFootage: parsed.data.squareFootage,
      cleaningFrequency: cleanText(parsed.data.cleaningFrequency, 120),
      serviceRequested: cleanText(parsed.data.serviceRequested, 160),
      budget: cleanOptional(parsed.data.budget, 120),
      preferredStartDate: parsed.data.preferredStartDate,
      notes: cleanOptional(parsed.data.notes, 4000),
    };

    let duplicateSignals: DuplicateSignal[];
    try {
      duplicateSignals = await findDuplicateSignals({
        businessName: cleanInput.businessName,
        email: cleanInput.email,
        phone: cleanInput.phone,
        address: cleanInput.address,
        city: cleanInput.city,
      });
    } catch (error) {
      return failureResponse("DUPLICATE_CHECK_FAILED", error);
    }

    let qualification: QualificationResult;
    try {
      qualification = await qualifyMarketplaceLead({
        lead: {
          businessName: cleanInput.businessName,
          contactName: cleanInput.contactName,
          email: cleanInput.email,
          phone: cleanInput.phone,
          address: cleanInput.address,
          city: cleanInput.city,
          state: cleanInput.state,
          zipCode: cleanInput.zipCode,
          propertyType: cleanInput.propertyType,
          squareFootage: cleanInput.squareFootage,
          cleaningFrequency: cleanInput.cleaningFrequency,
          serviceRequested: cleanInput.serviceRequested,
          budget: cleanInput.budget,
          preferredStartDate: cleanInput.preferredStartDate,
          notes: cleanInput.notes,
        },
        duplicateSignals,
        honeypotValue: parsed.data.website ?? "",
      });
    } catch (error) {
      return failureResponse("QUALIFICATION_FAILED", error);
    }

    let photoUrls: string[];
    try {
      photoUrls = await uploadLeadPhotos(photoFiles);
    } catch (error) {
      return failureResponse("PHOTO_UPLOAD_FAILED", error);
    }

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("marketplace_leads")
      .insert({
        business_name: cleanInput.businessName,
        contact_name: cleanInput.contactName,
        email: cleanInput.email,
        phone: cleanInput.phone,
        address: cleanInput.address,
        city: cleanInput.city,
        state: cleanInput.state,
        zip_code: cleanInput.zipCode,
        property_type: cleanInput.propertyType,
        square_footage: cleanInput.squareFootage,
        cleaning_frequency: cleanInput.cleaningFrequency,
        service_requested: cleanInput.serviceRequested,
        budget: cleanInput.budget,
        preferred_start_date: cleanInput.preferredStartDate,
        notes: cleanInput.notes,
        photo_urls: photoUrls,
        ai_score: qualification.qualityScore,
        estimated_contract_value: qualification.estimatedAnnualValue,
        qualification_status: qualification.qualificationStatus,
        quality_score: qualification.qualityScore,
        lead_grade: qualification.leadGrade,
        estimated_monthly_value: qualification.estimatedMonthlyValue,
        estimated_annual_value: qualification.estimatedAnnualValue,
        close_probability: qualification.closeProbability,
        urgency_score: qualification.urgencyScore,
        completeness_score: qualification.completenessScore,
        duplicate_risk: qualification.duplicateRisk,
        spam_risk: qualification.spamRisk,
        qualification_summary: qualification.qualificationSummary,
        scoring_breakdown: qualification.scoringBreakdown,
        qualification_last_run_at: new Date().toISOString(),
        status: "new",
      })
      .select("lead_id")
      .single();

    if (error) {
      return failureResponse("DATABASE_WRITE_FAILED", error);
    }

    try {
      const { error: historyError } = await supabase
        .from("marketplace_lead_audit_history")
        .insert({
          lead_id: data.lead_id,
          action: "lead_qualified",
          change_summary: "Temporary request-quote diagnostic history entry.",
          before_data: null,
          after_data: {
            lead_id: data.lead_id,
            qualification_status: qualification.qualificationStatus,
            quality_score: qualification.qualityScore,
            lead_grade: qualification.leadGrade,
          },
          metadata: {
            source: "request-quote",
            diagnostic: true,
          },
        });

      if (historyError) {
        return failureResponse("HISTORY_WRITE_FAILED", historyError);
      }
    } catch (error) {
      return failureResponse("HISTORY_WRITE_FAILED", error);
    }

    return NextResponse.json({ ok: true, leadId: data.lead_id });
  } catch (error) {
    return failureResponse("VALIDATION_FAILED", error);
  }
}
