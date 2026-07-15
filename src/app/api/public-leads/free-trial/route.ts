import { NextResponse } from "next/server";
import { capturePublicSalesLead } from "@/lib/sales-leads";

type FreeTrialLeadBody = {
  name?: string;
  email?: string;
  company?: string;
  phone?: string;
  message?: string;
  website?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FreeTrialLeadBody;

    await capturePublicSalesLead({
      source: "free_trial",
      contactName: body.name ?? "",
      email: body.email ?? "",
      companyName: body.company,
      phone: body.phone,
      message: body.message || "Website free trial signup inquiry.",
      foundingPartnerInterest: false,
      honeypot: body.website,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Could not submit free trial inquiry.";

    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
