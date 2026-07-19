import "server-only";
import { getAiProvider } from "@/lib/ai/provider";

export type LeadQualificationInput = {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: string;
  squareFootage: number;
  cleaningFrequency: string;
  serviceRequested: string;
  budget: string | null;
  preferredStartDate: string;
  notes: string | null;
  createdAtIso?: string;
};

export type DuplicateSignal = {
  leadId: string;
  signalType: "email" | "phone" | "address_business" | "business_city";
  matchedValue: string;
  createdAt: string;
};

export type QualificationResult = {
  qualificationStatus: "New" | "Needs Review" | "Verified" | "Rejected";
  qualityScore: number;
  leadGrade: "A+" | "A" | "B" | "C" | "D";
  estimatedMonthlyValue: number;
  estimatedAnnualValue: number;
  closeProbability: number;
  urgencyScore: number;
  completenessScore: number;
  duplicateRisk: number;
  spamRisk: number;
  qualificationSummary: string;
  scoringBreakdown: Record<string, unknown>;
};

type ScoreDetail = {
  points: number;
  reason: string;
};

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "yopmail.com",
]);

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizePhone(phone: string) {
  return phone.replace(/[^0-9]/g, "");
}

function parseBudgetToMonthly(budget: string | null) {
  if (!budget) return null;
  const raw = budget.toLowerCase().replace(/,/g, "").trim();
  const matches = raw.match(/\d+(?:\.\d+)?/g);
  if (!matches || matches.length === 0) return null;

  const first = Number(matches[0]);
  if (!Number.isFinite(first)) return null;

  if (raw.includes("year") || raw.includes("annual") || raw.includes("yr")) {
    return first / 12;
  }

  if (raw.includes("week")) {
    return first * 4.33;
  }

  if (raw.includes("day")) {
    return first * 21;
  }

  return first;
}

function monthlyVisitsForFrequency(cleaningFrequency: string) {
  const normalized = cleaningFrequency.toLowerCase();
  if (normalized.includes("daily")) return 22;
  if (normalized.includes("weekly")) return 4;
  if (normalized.includes("bi-weekly") || normalized.includes("biweekly"))
    return 2;
  if (normalized.includes("monthly")) return 1;
  return 0.5;
}

function scorePropertyType(propertyType: string): ScoreDetail {
  const normalized = propertyType.toLowerCase();

  if (
    /(office|medical|warehouse|industrial|retail|school|facility|commercial)/.test(
      normalized,
    )
  ) {
    return { points: 22, reason: "Clear commercial property fit." };
  }

  if (/(mixed|other)/.test(normalized)) {
    return {
      points: 14,
      reason: "Potentially commercial but needs confirmation.",
    };
  }

  if (/(residential|house|apartment|condo)/.test(normalized)) {
    return {
      points: 2,
      reason: "Residential profile is a lower marketplace fit.",
    };
  }

  return { points: 10, reason: "Unknown property type; neutral weighting." };
}

function scoreSquareFootage(squareFootage: number): ScoreDetail {
  if (squareFootage >= 20000) {
    return {
      points: 16,
      reason: "Large property size with strong contract potential.",
    };
  }
  if (squareFootage >= 10000) {
    return {
      points: 13,
      reason: "Mid-large property size supports recurring value.",
    };
  }
  if (squareFootage >= 3000) {
    return { points: 9, reason: "Moderate square footage; viable lead." };
  }
  if (squareFootage >= 1000) {
    return { points: 5, reason: "Smaller property; lower deal value." };
  }

  return { points: 2, reason: "Very small property footprint." };
}

function scoreFrequency(cleaningFrequency: string): ScoreDetail {
  const visits = monthlyVisitsForFrequency(cleaningFrequency);

  if (visits >= 20) {
    return {
      points: 16,
      reason: "Daily service indicates high urgency and recurring value.",
    };
  }
  if (visits >= 4) {
    return {
      points: 12,
      reason: "Weekly recurring schedule indicates strong intent.",
    };
  }
  if (visits >= 2) {
    return {
      points: 8,
      reason: "Bi-weekly cadence shows medium buying intent.",
    };
  }
  if (visits >= 1) {
    return {
      points: 5,
      reason: "Monthly demand indicates lower recurring volume.",
    };
  }

  return {
    points: 3,
    reason: "One-time or unclear cadence reduces confidence.",
  };
}

function scoreBudget(monthlyBudget: number | null): ScoreDetail {
  if (monthlyBudget == null) {
    return { points: 4, reason: "Budget omitted; reduced pricing confidence." };
  }
  if (monthlyBudget >= 5000) {
    return {
      points: 12,
      reason: "High budget supports enterprise-level service scope.",
    };
  }
  if (monthlyBudget >= 2500) {
    return {
      points: 10,
      reason: "Budget aligns with mid-size commercial contracts.",
    };
  }
  if (monthlyBudget >= 1200) {
    return {
      points: 7,
      reason: "Budget supports baseline recurring commercial service.",
    };
  }

  return { points: 4, reason: "Lower budget may constrain viable scope." };
}

function scoreStartDate(preferredStartDate: string): {
  score: ScoreDetail;
  urgency: number;
} {
  const parsed = new Date(preferredStartDate);
  if (Number.isNaN(parsed.getTime())) {
    return {
      score: { points: 2, reason: "Preferred start date missing or invalid." },
      urgency: 10,
    };
  }

  const now = new Date();
  const ms = parsed.getTime() - now.getTime();
  const days = Math.round(ms / (1000 * 60 * 60 * 24));

  if (days <= 7) {
    return {
      score: { points: 10, reason: "Immediate start requested; high urgency." },
      urgency: 95,
    };
  }
  if (days <= 21) {
    return {
      score: {
        points: 8,
        reason: "Near-term start date indicates active buying cycle.",
      },
      urgency: 75,
    };
  }
  if (days <= 45) {
    return {
      score: { points: 6, reason: "Moderate start window with solid intent." },
      urgency: 55,
    };
  }

  return {
    score: {
      points: 4,
      reason: "Longer start horizon; lower immediate urgency.",
    },
    urgency: 30,
  };
}

function scoreContactCompleteness(input: LeadQualificationInput): {
  score: ScoreDetail;
  completeness: number;
} {
  const checks = [
    input.businessName,
    input.contactName,
    input.email,
    input.phone,
    input.address,
    input.city,
    input.state,
    input.zipCode,
    input.propertyType,
    String(input.squareFootage),
    input.cleaningFrequency,
    input.serviceRequested,
    input.preferredStartDate,
    input.notes ?? "",
  ];

  const filled = checks.filter(
    (value) => normalizeWhitespace(value).length > 0,
  ).length;
  const completeness = Math.round((filled / checks.length) * 100);

  if (completeness >= 90) {
    return {
      score: {
        points: 10,
        reason: "Lead submitted highly complete contact and scope details.",
      },
      completeness,
    };
  }
  if (completeness >= 75) {
    return {
      score: {
        points: 7,
        reason: "Most key fields are present with minor gaps.",
      },
      completeness,
    };
  }

  return {
    score: {
      points: 4,
      reason: "Material information gaps reduce qualification confidence.",
    },
    completeness,
  };
}

function scoreServiceDetail(
  serviceRequested: string,
  notes: string | null,
): ScoreDetail {
  const serviceLength = normalizeWhitespace(serviceRequested).length;
  const notesLength = normalizeWhitespace(notes ?? "").length;
  const combined = serviceLength + notesLength;

  if (combined >= 120) {
    return {
      points: 8,
      reason: "Detailed service context improves matching confidence.",
    };
  }
  if (combined >= 60) {
    return {
      points: 6,
      reason: "Adequate detail provided for service requirements.",
    };
  }
  if (combined >= 20) {
    return { points: 4, reason: "Limited service detail provided." };
  }

  return {
    points: 2,
    reason: "Service request detail is minimal and requires review.",
  };
}

function evaluateSpamRisk(
  input: LeadQualificationInput,
  honeypotValue: string,
  duplicateSignals: DuplicateSignal[],
) {
  let spamRisk = 0;
  const reasons: string[] = [];

  if (honeypotValue.trim().length > 0) {
    spamRisk += 0.9;
    reasons.push("Hidden honeypot field was populated.");
  }

  const domain = input.email.split("@")[1]?.toLowerCase() ?? "";
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    spamRisk += 0.35;
    reasons.push("Email domain appears disposable.");
  }

  const notes = input.notes?.toLowerCase() ?? "";
  const urlCount = (notes.match(/https?:\/\//g) ?? []).length;
  if (urlCount >= 3) {
    spamRisk += 0.3;
    reasons.push("Notes contain multiple links.");
  }

  if (/\b(crypto|casino|seo|backlink|forex|viagra)\b/.test(notes)) {
    spamRisk += 0.5;
    reasons.push("Notes include common spam keywords.");
  }

  const duplicateByEmail = duplicateSignals.filter(
    (signal) => signal.signalType === "email",
  ).length;
  if (duplicateByEmail >= 4) {
    spamRisk += 0.2;
    reasons.push("High repeat count by email in historical leads.");
  }

  return {
    spamRisk: Number(clamp(spamRisk, 0, 1).toFixed(2)),
    reasons,
  };
}

function evaluateDuplicateRisk(duplicateSignals: DuplicateSignal[]) {
  const emailMatches = duplicateSignals.filter(
    (signal) => signal.signalType === "email",
  ).length;
  const phoneMatches = duplicateSignals.filter(
    (signal) => signal.signalType === "phone",
  ).length;
  const addressBusinessMatches = duplicateSignals.filter(
    (signal) => signal.signalType === "address_business",
  ).length;
  const businessCityMatches = duplicateSignals.filter(
    (signal) => signal.signalType === "business_city",
  ).length;

  let risk = 0;
  if (emailMatches > 0) risk += 0.45;
  if (phoneMatches > 0) risk += 0.3;
  if (addressBusinessMatches > 0) risk += 0.35;
  if (businessCityMatches > 0) risk += 0.2;
  risk += Math.min(0.2, duplicateSignals.length * 0.03);

  return {
    duplicateRisk: Number(clamp(risk, 0, 1).toFixed(2)),
    details: {
      totalSignals: duplicateSignals.length,
      emailMatches,
      phoneMatches,
      addressBusinessMatches,
      businessCityMatches,
    },
  };
}

function estimateValues(
  input: LeadQualificationInput,
  monthlyBudget: number | null,
) {
  const visitsPerMonth = monthlyVisitsForFrequency(input.cleaningFrequency);
  const sizeRate = clamp(input.squareFootage * 0.085, 250, 6500);
  const baseMonthly = Math.round(sizeRate * visitsPerMonth * 0.32);

  const estimatedMonthlyValue =
    monthlyBudget == null
      ? baseMonthly
      : Math.round(baseMonthly * 0.55 + monthlyBudget * 0.45);

  const estimatedAnnualValue = estimatedMonthlyValue * 12;
  return {
    estimatedMonthlyValue,
    estimatedAnnualValue,
  };
}

function deriveGrade(score: number): "A+" | "A" | "B" | "C" | "D" {
  if (score >= 92) return "A+";
  if (score >= 82) return "A";
  if (score >= 68) return "B";
  if (score >= 52) return "C";
  return "D";
}

function deriveQualificationStatus(input: {
  qualityScore: number;
  duplicateRisk: number;
  spamRisk: number;
  completenessScore: number;
}): "New" | "Needs Review" | "Verified" | "Rejected" {
  if (input.spamRisk >= 0.8) {
    return "Rejected";
  }

  if (
    input.duplicateRisk >= 0.55 ||
    input.spamRisk >= 0.4 ||
    input.completenessScore < 70 ||
    input.qualityScore < 60
  ) {
    return "Needs Review";
  }

  return "New";
}

function deterministicSummary(input: {
  leadGrade: string;
  qualityScore: number;
  urgencyScore: number;
  duplicateRisk: number;
  spamRisk: number;
  estimatedMonthlyValue: number;
  qualificationStatus: string;
}) {
  return [
    `Grade ${input.leadGrade} lead with quality score ${input.qualityScore}/100 and urgency ${input.urgencyScore}/100.`,
    `Estimated monthly value is $${input.estimatedMonthlyValue.toLocaleString("en-US")}.`,
    `Duplicate risk ${Math.round(input.duplicateRisk * 100)}% and spam risk ${Math.round(input.spamRisk * 100)}%.`,
    `Current qualification status: ${input.qualificationStatus}.`,
  ].join(" ");
}

async function buildOptionalAiSummary(baseContext: Record<string, string>) {
  try {
    const provider = getAiProvider();
    const generated = await Promise.race([
      provider.generate({
        employeeSlug: "sales-manager",
        systemPrompt:
          "You are assisting a super admin with lead qualification for a commercial cleaning marketplace. Be concise, factual, and explainable.",
        userPrompt:
          "Provide three short sections: (1) qualification summary, (2) top risks, (3) recommended next action.",
        context: baseContext,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("AI summary timeout")), 2200);
      }),
    ]);

    if (generated.isMock) {
      return null;
    }

    return generated.content.slice(0, 2000);
  } catch {
    return null;
  }
}

export async function qualifyMarketplaceLead(input: {
  lead: LeadQualificationInput;
  duplicateSignals: DuplicateSignal[];
  honeypotValue?: string;
}): Promise<QualificationResult> {
  const lead = {
    ...input.lead,
    businessName: normalizeWhitespace(input.lead.businessName),
    contactName: normalizeWhitespace(input.lead.contactName),
    email: normalizeWhitespace(input.lead.email).toLowerCase(),
    phone: normalizePhone(input.lead.phone),
    address: normalizeWhitespace(input.lead.address),
    city: normalizeWhitespace(input.lead.city),
    state: normalizeWhitespace(input.lead.state),
    zipCode: normalizeWhitespace(input.lead.zipCode),
    propertyType: normalizeWhitespace(input.lead.propertyType),
    cleaningFrequency: normalizeWhitespace(input.lead.cleaningFrequency),
    serviceRequested: normalizeWhitespace(input.lead.serviceRequested),
    budget: input.lead.budget ? normalizeWhitespace(input.lead.budget) : null,
    notes: input.lead.notes ? normalizeWhitespace(input.lead.notes) : null,
  };

  const budgetMonthly = parseBudgetToMonthly(lead.budget);
  const property = scorePropertyType(lead.propertyType);
  const sqft = scoreSquareFootage(lead.squareFootage);
  const frequency = scoreFrequency(lead.cleaningFrequency);
  const budget = scoreBudget(budgetMonthly);
  const start = scoreStartDate(lead.preferredStartDate);
  const completeness = scoreContactCompleteness(lead);
  const serviceDetail = scoreServiceDetail(lead.serviceRequested, lead.notes);
  const duplicate = evaluateDuplicateRisk(input.duplicateSignals);
  const spam = evaluateSpamRisk(
    lead,
    input.honeypotValue ?? "",
    input.duplicateSignals,
  );
  const values = estimateValues(lead, budgetMonthly);

  const positiveScore =
    property.points +
    sqft.points +
    frequency.points +
    budget.points +
    start.score.points +
    completeness.score.points +
    serviceDetail.points;

  const penalty = Math.round(duplicate.duplicateRisk * 20 + spam.spamRisk * 35);
  const qualityScore = clamp(Math.round(30 + positiveScore - penalty), 0, 100);
  const closeProbability = Number(
    clamp(
      (qualityScore / 100) * 0.8 +
        (start.urgency / 100) * 0.15 -
        duplicate.duplicateRisk * 0.12 -
        spam.spamRisk * 0.18,
      0.02,
      0.96,
    ).toFixed(2),
  );

  const urgencyScore = clamp(
    start.urgency - Math.round(spam.spamRisk * 20),
    0,
    100,
  );
  const completenessScore = completeness.completeness;
  const duplicateRisk = duplicate.duplicateRisk;
  const spamRisk = spam.spamRisk;
  const leadGrade = deriveGrade(qualityScore);
  const qualificationStatus = deriveQualificationStatus({
    qualityScore,
    duplicateRisk,
    spamRisk,
    completenessScore,
  });

  const deterministic = deterministicSummary({
    leadGrade,
    qualityScore,
    urgencyScore,
    duplicateRisk,
    spamRisk,
    estimatedMonthlyValue: values.estimatedMonthlyValue,
    qualificationStatus,
  });

  const optionalAiSummary = await buildOptionalAiSummary({
    propertyType: lead.propertyType,
    squareFootage: String(lead.squareFootage),
    cleaningFrequency: lead.cleaningFrequency,
    budgetMonthly:
      budgetMonthly == null ? "unknown" : String(Math.round(budgetMonthly)),
    preferredStartDate: lead.preferredStartDate,
    completenessScore: String(completenessScore),
    duplicateRisk: String(duplicateRisk),
    spamRisk: String(spamRisk),
    serviceRequested: lead.serviceRequested,
    notes: lead.notes ?? "",
    deterministicSummary: deterministic,
  });

  const qualificationSummary = optionalAiSummary
    ? `${deterministic}\n\nAI Context:\n${optionalAiSummary}`
    : deterministic;

  return {
    qualificationStatus,
    qualityScore,
    leadGrade,
    estimatedMonthlyValue: values.estimatedMonthlyValue,
    estimatedAnnualValue: values.estimatedAnnualValue,
    closeProbability,
    urgencyScore,
    completenessScore,
    duplicateRisk,
    spamRisk,
    qualificationSummary,
    scoringBreakdown: {
      version: "phase1b-v1",
      positiveFactors: {
        propertyType: property,
        squareFootage: sqft,
        cleaningFrequency: frequency,
        budget,
        preferredStartDate: start.score,
        contactCompleteness: completeness.score,
        serviceDetail,
      },
      riskFactors: {
        duplicateRisk,
        spamRisk,
        duplicateSignals: input.duplicateSignals,
        spamReasons: spam.reasons,
      },
      derived: {
        qualityScore,
        leadGrade,
        qualificationStatus,
        closeProbability,
        urgencyScore,
        completenessScore,
        estimatedMonthlyValue: values.estimatedMonthlyValue,
        estimatedAnnualValue: values.estimatedAnnualValue,
      },
    },
  };
}

export function buildDuplicateLookupTokens(input: {
  email: string;
  phone: string;
  address: string;
  businessName: string;
  city: string;
}) {
  return {
    email: normalizeWhitespace(input.email).toLowerCase(),
    phoneDigits: normalizePhone(input.phone),
    address: normalizeWhitespace(input.address).toLowerCase(),
    businessName: normalizeWhitespace(input.businessName).toLowerCase(),
    city: normalizeWhitespace(input.city).toLowerCase(),
  };
}
