import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const MAX_PHOTO_COUNT = 3;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_BUCKET = "marketplace-lead-photos";

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

type PlaceholderScoring = {
  aiScore: number;
  estimatedContractValue: number;
  closeProbability: number;
};

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

function buildPlaceholderScoring(input: {
  squareFootage: number;
  cleaningFrequency: string;
  serviceRequested: string;
}): PlaceholderScoring {
  const normalizedFrequency = input.cleaningFrequency.toLowerCase();
  const monthlyVisits =
    normalizedFrequency === "daily"
      ? 22
      : normalizedFrequency === "weekly"
        ? 4
        : normalizedFrequency === "bi-weekly"
          ? 2
          : normalizedFrequency === "monthly"
            ? 1
            : 0.5;

  const serviceMultiplier = input.serviceRequested
    .toLowerCase()
    .includes("deep")
    ? 1.35
    : 1;
  const estimatedContractValue = Math.max(
    500,
    Math.round(input.squareFootage * 0.11 * monthlyVisits * serviceMultiplier),
  );

  const aiScoreRaw =
    35 +
    Math.min(35, input.squareFootage / 4000) +
    Math.min(25, monthlyVisits * 3);
  const aiScore = Math.max(1, Math.min(99, Math.round(aiScoreRaw)));

  const closeProbabilityRaw = 0.2 + aiScore / 140;
  const closeProbability = Number(
    Math.min(0.92, Math.max(0.1, closeProbabilityRaw)).toFixed(2),
  );

  return {
    aiScore,
    estimatedContractValue,
    closeProbability,
  };
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
      const firstIssue = parsed.error.issues[0]?.message || "Invalid request.";
      return NextResponse.json(
        { ok: false, error: firstIssue },
        { status: 400 },
      );
    }

    if (parsed.data.website) {
      return NextResponse.json({ ok: true, spamBlocked: true });
    }

    const photoFiles = formData
      .getAll("photos")
      .filter((entry): entry is File => entry instanceof File)
      .filter((file) => file.size > 0);

    if (photoFiles.length > MAX_PHOTO_COUNT) {
      return NextResponse.json(
        { ok: false, error: `Upload up to ${MAX_PHOTO_COUNT} photos.` },
        { status: 400 },
      );
    }

    for (const photo of photoFiles) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type)) {
        return NextResponse.json(
          { ok: false, error: "Photos must be JPG, PNG, or WEBP." },
          { status: 400 },
        );
      }

      if (photo.size > MAX_PHOTO_BYTES) {
        return NextResponse.json(
          { ok: false, error: "Each photo must be 5MB or smaller." },
          { status: 400 },
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

    const scoring = buildPlaceholderScoring({
      squareFootage: cleanInput.squareFootage,
      cleaningFrequency: cleanInput.cleaningFrequency,
      serviceRequested: cleanInput.serviceRequested,
    });

    const photoUrls = await uploadLeadPhotos(photoFiles);

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
        ai_score: scoring.aiScore,
        estimated_contract_value: scoring.estimatedContractValue,
        close_probability: scoring.closeProbability,
        status: "new",
      })
      .select("lead_id")
      .single();

    if (error) {
      throw new Error(`Failed to save lead: ${error.message}`);
    }

    return NextResponse.json({ ok: true, leadId: data.lead_id });
  } catch (error) {
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Could not submit quote request.";

    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
