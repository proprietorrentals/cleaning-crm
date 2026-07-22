import { NextResponse } from "next/server";
import { z } from "zod";
import { createMarketplaceLeadFromSeed } from "@/lib/lead-marketplace/create-marketplace-lead";
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
  website: z.preprocess(
    (value) => (value === null ? undefined : value),
    z.string().trim().max(200).optional(),
  ),
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

    const photoUrls = await uploadLeadPhotos(photoFiles);

    const result = await createMarketplaceLeadFromSeed({
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
      photoUrls,
      honeypotValue: parsed.data.website ?? "",
    });

    return NextResponse.json({ ok: true, leadId: result.leadId });
  } catch (error) {
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Could not submit quote request.";

    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
