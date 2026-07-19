import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import {
  DEFAULT_TARGET_TENANT_ID,
  getAppBaseUrl,
  getLeadCreditPackage,
} from "@/lib/lead-marketplace/credits";
import { requireSuperAdminAccess } from "@/lib/supabase/super-admin";

const bodySchema = z.object({
  packageId: z.string().trim().min(1),
  tenantId: z.string().uuid().optional(),
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-06-20",
});

async function ensureAccess() {
  const access = await requireSuperAdminAccess();

  if (access.needsAuth) {
    return {
      deniedResponse: NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 },
      ),
      access,
    };
  }

  if (access.denied) {
    return {
      deniedResponse: NextResponse.json(
        { success: false, message: "Super Admin access required." },
        { status: 403 },
      ),
      access,
    };
  }

  if (access.rpcError) {
    return {
      deniedResponse: NextResponse.json(
        { success: false, message: "Unable to verify Super Admin access." },
        { status: 503 },
      ),
      access,
    };
  }

  return { deniedResponse: null, access };
}

export async function POST(request: NextRequest) {
  const { deniedResponse, access } = await ensureAccess();
  if (deniedResponse) {
    return deniedResponse;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { success: false, message: "Stripe is not configured." },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid request payload.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const pkg = getLeadCreditPackage(parsed.data.packageId);
  if (!pkg) {
    return NextResponse.json(
      { success: false, message: "Unknown credit package." },
      { status: 400 },
    );
  }

  const targetTenantId = parsed.data.tenantId ?? DEFAULT_TARGET_TENANT_ID;
  const baseUrl = getAppBaseUrl();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      success_url: `${baseUrl}/super-admin/lead-marketplace?creditsPurchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/super-admin/lead-marketplace?creditsPurchase=cancelled`,
      customer_email: access.user?.email ?? undefined,
      client_reference_id: targetTenantId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: pkg.amountCents,
            product_data: {
              name: `${pkg.name} Lead Credits`,
              description: `${pkg.credits} marketplace credits package`,
            },
          },
        },
      ],
      metadata: {
        purchaseType: "lead_marketplace_credits",
        packageId: pkg.id,
        packageCredits: String(pkg.credits),
        packageAmountCents: String(pkg.amountCents),
        tenantId: targetTenantId,
        initiatedByUserId: access.user?.id ?? "",
        initiatedByUserEmail: access.user?.email ?? "",
      },
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to create checkout session.",
      },
      { status: 500 },
    );
  }
}
