export type LeadCreditPackageId = "starter" | "growth" | "professional";

export type LeadCreditPackage = {
  id: LeadCreditPackageId;
  name: string;
  credits: number;
  amountCents: number;
  description: string;
};

export const LEAD_CREDIT_PACKAGES: Record<
  LeadCreditPackageId,
  LeadCreditPackage
> = {
  starter: {
    id: "starter",
    name: "Starter",
    credits: 10,
    amountCents: 4900,
    description:
      "Best for trying the marketplace with a small volume of claims.",
  },
  growth: {
    id: "growth",
    name: "Growth",
    credits: 40,
    amountCents: 14900,
    description: "Great for active teams claiming leads every week.",
  },
  professional: {
    id: "professional",
    name: "Professional",
    credits: 100,
    amountCents: 29900,
    description: "Highest value for high-throughput Marketplace operations.",
  },
};

export function listLeadCreditPackages() {
  return Object.values(LEAD_CREDIT_PACKAGES);
}

export function getLeadCreditPackage(packageId: string) {
  const key = packageId as LeadCreditPackageId;
  return LEAD_CREDIT_PACKAGES[key] ?? null;
}

export function getAppBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  );
}
