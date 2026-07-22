export type CityFaqItem = {
  question: string;
  answer: string;
};

export type NearbyCityLink = {
  stateSlug: string;
  citySlug: string;
  label: string;
};

export type RelatedSaasLink = {
  href: string;
  label: string;
};

export type MarketplaceCityPage = {
  stateSlug: string;
  citySlug: string;
  cityName: string;
  stateName: string;
  stateCode: string;
  heroTitle: string;
  heroDescription: string;
  marketOverview: string;
  marketSignals: string[];
  whyServiceOs: string[];
  howItWorks: string[];
  faqs: CityFaqItem[];
  ctaTitle: string;
  ctaDescription: string;
  nearbyCities: NearbyCityLink[];
  relatedSaasLinks: RelatedSaasLink[];
  keywords: string[];
};

const DEFAULT_RELATED_SAAS_LINKS: RelatedSaasLink[] = [
  {
    href: "/commercial-cleaning-software",
    label: "Commercial Cleaning Software",
  },
  { href: "/cleaning-crm", label: "Cleaning CRM" },
  {
    href: "/cleaning-business-management-software",
    label: "Cleaning Business Management Software",
  },
];

export const MARKETPLACE_CITY_PAGES: MarketplaceCityPage[] = [
  {
    stateSlug: "texas",
    citySlug: "austin",
    cityName: "Austin",
    stateName: "Texas",
    stateCode: "TX",
    heroTitle:
      "Commercial cleaning leads in Austin, TX with practical routing workflows",
    heroDescription:
      "Win more Austin commercial opportunities by qualifying requests faster, prioritizing high-fit accounts, and aligning sales with operations from day one.",
    marketOverview:
      "Austin demand is shaped by mixed-use offices, healthcare corridors, schools, and fast-moving tenant turnover, so response speed and clear scopes often decide who gets shortlisted.",
    marketSignals: [
      "Class A and flex office opportunities typically request after-hours scheduling detail.",
      "Medical and lab-adjacent facilities often require stricter onboarding and compliance notes.",
      "Property managers favor vendors that can quote recurring and one-time deep-clean options in the same cycle.",
    ],
    whyServiceOs: [
      "Capture qualification details early so estimators stop chasing low-fit requests.",
      "Standardize handoffs from lead intake to quote creation and account kickoff.",
      "Track conversion performance by vertical to refine Austin territory strategy.",
    ],
    howItWorks: [
      "Collect each Austin inquiry with property type, service window, and urgency.",
      "Score opportunities against your preferred contract profile before assignment.",
      "Route qualified leads into structured follow-up and quote milestones.",
    ],
    faqs: [
      {
        question: "Can Service OS help our team respond faster in Austin?",
        answer:
          "Yes. Service OS centralizes lead intake, qualification notes, and follow-up tasks so your team can prioritize the best-fit opportunities quickly.",
      },
      {
        question: "Do these pages expose private marketplace inventory?",
        answer:
          "No. Public city pages are educational and do not display private marketplace leads, customer records, or account-level data.",
      },
      {
        question: "Can we segment Austin leads by property type?",
        answer:
          "Yes. You can organize opportunities by office, medical, retail, and other property categories to improve assignment and quoting workflows.",
      },
    ],
    ctaTitle: "Build a stronger Austin lead-to-contract pipeline",
    ctaDescription:
      "See how Service OS helps cleaning companies coordinate local demand, quoting, and follow-through in one workflow.",
    nearbyCities: [
      { stateSlug: "texas", citySlug: "dallas", label: "Dallas, TX" },
      { stateSlug: "georgia", citySlug: "atlanta", label: "Atlanta, GA" },
    ],
    relatedSaasLinks: DEFAULT_RELATED_SAAS_LINKS,
    keywords: [
      "Austin commercial cleaning leads",
      "Austin janitorial leads",
      "commercial cleaning CRM Austin",
    ],
  },
  {
    stateSlug: "texas",
    citySlug: "dallas",
    cityName: "Dallas",
    stateName: "Texas",
    stateCode: "TX",
    heroTitle:
      "Commercial cleaning leads in Dallas, TX for high-volume sales teams",
    heroDescription:
      "Organize Dallas opportunities by service fit, contract value, and response deadlines so your team can scale outreach without losing consistency.",
    marketOverview:
      "Dallas buying cycles often involve multi-site portfolios and procurement checkpoints, which makes qualification discipline and documented follow-up essential.",
    marketSignals: [
      "Many bids request clear staffing and escalation plans before final review.",
      "Industrial and logistics-adjacent properties often emphasize floor care and schedule reliability.",
      "Regional operators value vendors who can maintain visibility across multiple prospects at once.",
    ],
    whyServiceOs: [
      "Prioritize lead queues by fit and expected contract value.",
      "Keep CRM history and operational readiness details connected.",
      "Reduce dropped follow-ups with owner-based accountability.",
    ],
    howItWorks: [
      "Ingest Dallas inquiries with standardized scope fields.",
      "Route each lead to the right owner by territory and capability.",
      "Advance qualified opportunities through repeatable quote checkpoints.",
    ],
    faqs: [
      {
        question:
          "Is Service OS useful for multi-location Dallas opportunities?",
        answer:
          "Yes. Service OS helps teams track each location context while keeping one opportunity workflow for cleaner coordination.",
      },
      {
        question: "Can we avoid exposing customer data on these public pages?",
        answer:
          "Yes. City landing pages contain general market guidance only and never reveal customer or tenant-private records.",
      },
      {
        question: "Does this support recurring contract sales motions?",
        answer:
          "Yes. The workflow is designed for recurring commercial cleaning opportunities with structured follow-up stages.",
      },
    ],
    ctaTitle: "Scale Dallas opportunity management with less guesswork",
    ctaDescription:
      "Book a walkthrough to see how Service OS streamlines qualification and conversion for Dallas commercial accounts.",
    nearbyCities: [
      { stateSlug: "texas", citySlug: "austin", label: "Austin, TX" },
      { stateSlug: "illinois", citySlug: "chicago", label: "Chicago, IL" },
    ],
    relatedSaasLinks: DEFAULT_RELATED_SAAS_LINKS,
    keywords: [
      "Dallas commercial cleaning leads",
      "Dallas janitorial sales software",
      "commercial cleaning pipeline Dallas",
    ],
  },
  {
    stateSlug: "georgia",
    citySlug: "atlanta",
    cityName: "Atlanta",
    stateName: "Georgia",
    stateCode: "GA",
    heroTitle:
      "Commercial cleaning leads in Atlanta, GA with better qualification control",
    heroDescription:
      "Route Atlanta opportunities with clear ownership, local context, and consistent quote follow-up so your pipeline stays healthy.",
    marketOverview:
      "Atlanta demand spans office campuses, healthcare networks, and education facilities, creating varied scope requirements that reward disciplined discovery.",
    marketSignals: [
      "Bid windows can be short, especially for urgent janitorial replacements.",
      "Facility stakeholders often request service-level clarity before site walks.",
      "Growth teams need reliable follow-up cadence to compete with regional incumbents.",
    ],
    whyServiceOs: [
      "Standardize intake questions for complex Atlanta opportunities.",
      "Coordinate sales, estimating, and operations in one system.",
      "Measure conversion by lead source and property segment.",
    ],
    howItWorks: [
      "Capture service requirements and site profile details at first touch.",
      "Score and route opportunities to the right sales owner.",
      "Track each quote and next-step commitment through close.",
    ],
    faqs: [
      {
        question:
          "Can Service OS support both office and healthcare demand in Atlanta?",
        answer:
          "Yes. You can segment opportunities by property type and maintain workflows tailored to each service context.",
      },
      {
        question: "Are these city pages connected to private lead records?",
        answer:
          "No. They are public informational pages and do not reveal private marketplace inventory or account data.",
      },
      {
        question: "How does Service OS help reduce slow follow-up?",
        answer:
          "It centralizes tasks, owner assignments, and stage visibility so high-priority leads are acted on consistently.",
      },
    ],
    ctaTitle: "Convert Atlanta demand with a cleaner sales workflow",
    ctaDescription:
      "Explore how Service OS helps your team qualify and convert Atlanta commercial leads with stronger consistency.",
    nearbyCities: [
      { stateSlug: "florida", citySlug: "miami", label: "Miami, FL" },
      { stateSlug: "texas", citySlug: "austin", label: "Austin, TX" },
    ],
    relatedSaasLinks: DEFAULT_RELATED_SAAS_LINKS,
    keywords: [
      "Atlanta commercial cleaning leads",
      "Atlanta janitorial opportunities",
      "cleaning CRM Atlanta",
    ],
  },
  {
    stateSlug: "florida",
    citySlug: "miami",
    cityName: "Miami",
    stateName: "Florida",
    stateCode: "FL",
    heroTitle:
      "Commercial cleaning leads in Miami, FL built for service reliability",
    heroDescription:
      "Manage Miami commercial lead flow with clear qualification and quote workflows that support recurring contract growth.",
    marketOverview:
      "Miami demand is often shaped by hospitality-adjacent expectations, mixed portfolios, and strict service consistency requirements across high-traffic properties.",
    marketSignals: [
      "Property teams commonly prioritize response speed and quality controls.",
      "Retail and office accounts often require flexible service windows.",
      "Recurring agreements are easier to win when scope details are explicit early.",
    ],
    whyServiceOs: [
      "Structure intake and fit scoring before quoting resources are committed.",
      "Give stakeholders one timeline from discovery through close.",
      "Track regional performance trends to refine Miami targeting.",
    ],
    howItWorks: [
      "Capture Miami requests with complete service and schedule requirements.",
      "Route opportunities based on fit, urgency, and territory coverage.",
      "Move qualified leads through a repeatable follow-up and quote cadence.",
    ],
    faqs: [
      {
        question:
          "Does Service OS help with recurring contract opportunity tracking?",
        answer:
          "Yes. Service OS supports recurring opportunity workflows with stage tracking and clear ownership.",
      },
      {
        question: "Can our team use this without exposing private records?",
        answer:
          "Yes. Public pages are informational only and do not expose private marketplace or customer data.",
      },
      {
        question: "Can we monitor lead quality for Miami campaigns?",
        answer:
          "Yes. You can track lead progression and conversion trends to improve local campaign and outreach strategy.",
      },
    ],
    ctaTitle: "Improve Miami lead execution from intake to close",
    ctaDescription:
      "See how Service OS helps cleaning teams maintain momentum on Miami commercial opportunities.",
    nearbyCities: [
      { stateSlug: "georgia", citySlug: "atlanta", label: "Atlanta, GA" },
      { stateSlug: "new-york", citySlug: "new-york", label: "New York, NY" },
    ],
    relatedSaasLinks: DEFAULT_RELATED_SAAS_LINKS,
    keywords: [
      "Miami commercial cleaning leads",
      "Miami janitorial lead management",
      "commercial cleaning software Miami",
    ],
  },
  {
    stateSlug: "illinois",
    citySlug: "chicago",
    cityName: "Chicago",
    stateName: "Illinois",
    stateCode: "IL",
    heroTitle:
      "Commercial cleaning leads in Chicago, IL with stronger bid readiness",
    heroDescription:
      "Keep Chicago opportunities organized with qualification standards, follow-up discipline, and clear quote milestones.",
    marketOverview:
      "Chicago opportunities frequently include detailed scope review and operational proof points, so teams with consistent process tend to advance faster.",
    marketSignals: [
      "Office and institutional buyers often request defined escalation procedures.",
      "Contract cycles can involve layered approvals across operations and procurement.",
      "High-volume periods reward teams that maintain strict pipeline visibility.",
    ],
    whyServiceOs: [
      "Align lead qualification with local contract realities.",
      "Reduce handoff friction between sales and operations.",
      "Keep follow-up commitments visible across the full team.",
    ],
    howItWorks: [
      "Document each Chicago opportunity using standardized fields.",
      "Prioritize high-fit contracts with owner assignment rules.",
      "Advance qualified leads through quote and review checkpoints.",
    ],
    faqs: [
      {
        question: "Can Service OS support complex Chicago bid cycles?",
        answer:
          "Yes. The platform helps teams track required steps, stakeholders, and follow-up deadlines across each opportunity.",
      },
      {
        question: "Will this page reveal active marketplace listings?",
        answer:
          "No. This page provides public educational content only and does not expose private marketplace lead inventory.",
      },
      {
        question: "Can we compare conversion trends by segment?",
        answer:
          "Yes. Teams can monitor outcomes by property type and lead source to improve future targeting.",
      },
    ],
    ctaTitle: "Create a more predictable Chicago pipeline",
    ctaDescription:
      "Book a demo to see how Service OS improves qualification, quote consistency, and close visibility in Chicago.",
    nearbyCities: [
      { stateSlug: "texas", citySlug: "dallas", label: "Dallas, TX" },
      { stateSlug: "new-york", citySlug: "new-york", label: "New York, NY" },
    ],
    relatedSaasLinks: DEFAULT_RELATED_SAAS_LINKS,
    keywords: [
      "Chicago commercial cleaning leads",
      "Chicago janitorial CRM",
      "commercial cleaning sales workflow Chicago",
    ],
  },
  {
    stateSlug: "new-york",
    citySlug: "new-york",
    cityName: "New York",
    stateName: "New York",
    stateCode: "NY",
    heroTitle:
      "Commercial cleaning leads in New York, NY for competitive contract cycles",
    heroDescription:
      "Stay competitive in New York by combining fast qualification, disciplined follow-up, and operations-ready quoting workflows.",
    marketOverview:
      "New York opportunities often move through dense decision layers and strict building requirements, making process transparency a major advantage.",
    marketSignals: [
      "Buyer groups commonly evaluate vendor responsiveness and execution confidence.",
      "Mixed-use and high-rise properties often need nuanced scheduling detail.",
      "Teams that track every next step clearly are better positioned in repeat bid cycles.",
    ],
    whyServiceOs: [
      "Keep opportunity intelligence centralized for faster account preparation.",
      "Support structured outreach across complex stakeholder groups.",
      "Connect sales activity to downstream service planning.",
    ],
    howItWorks: [
      "Capture New York lead context with consistent qualification prompts.",
      "Assign owners and deadlines based on opportunity potential.",
      "Track quote progress and close blockers in one shared workflow.",
    ],
    faqs: [
      {
        question:
          "Can Service OS help our team navigate high-volume New York demand?",
        answer:
          "Yes. Service OS keeps opportunities organized and visible so teams can prioritize and respond without losing quality.",
      },
      {
        question: "Does this include customer-level or private lead data?",
        answer:
          "No. Public city content is separate from authenticated marketplace and customer records.",
      },
      {
        question: "Can we map opportunities to recurring service potential?",
        answer:
          "Yes. Qualification and scoring workflows help teams focus on long-term, high-fit contracts.",
      },
    ],
    ctaTitle: "Strengthen New York contract pursuit workflows",
    ctaDescription:
      "See how Service OS helps your team qualify and convert New York opportunities with more control.",
    nearbyCities: [
      { stateSlug: "illinois", citySlug: "chicago", label: "Chicago, IL" },
      { stateSlug: "florida", citySlug: "miami", label: "Miami, FL" },
    ],
    relatedSaasLinks: DEFAULT_RELATED_SAAS_LINKS,
    keywords: [
      "New York commercial cleaning leads",
      "NYC janitorial opportunity management",
      "commercial cleaning CRM New York",
    ],
  },
  {
    stateSlug: "california",
    citySlug: "los-angeles",
    cityName: "Los Angeles",
    stateName: "California",
    stateCode: "CA",
    heroTitle:
      "Commercial cleaning leads in Los Angeles, CA with stronger territory execution",
    heroDescription:
      "Coordinate Los Angeles opportunities with fit-based qualification, clearer ownership, and repeatable quote progression.",
    marketOverview:
      "Los Angeles demand spans diverse property profiles and broad territory coverage, so teams need strong routing logic and consistent follow-up systems.",
    marketSignals: [
      "Route planning and schedule fit often affect close probability.",
      "Portfolio managers favor vendors that communicate clearly across locations.",
      "Complex service mixes benefit from standardized discovery workflows.",
    ],
    whyServiceOs: [
      "Route opportunities to the right team member based on territory and fit.",
      "Keep every lead stage visible so follow-up never depends on memory.",
      "Support data-backed decisions on where to invest sales time.",
    ],
    howItWorks: [
      "Capture each Los Angeles request with structured qualification data.",
      "Score and prioritize opportunities against your ideal contract profile.",
      "Advance qualified leads through consistent quote and review stages.",
    ],
    faqs: [
      {
        question: "Can Service OS help with large-service-area lead routing?",
        answer:
          "Yes. Teams can assign opportunities by territory and capacity so lead response remains consistent.",
      },
      {
        question: "Are private marketplace leads exposed on this page?",
        answer:
          "No. Public SEO pages never display private marketplace lead details or customer account data.",
      },
      {
        question: "Can we track which Los Angeles segments convert best?",
        answer:
          "Yes. Service OS supports segment-level tracking to guide local targeting and follow-up strategy.",
      },
    ],
    ctaTitle: "Convert Los Angeles opportunities with better process control",
    ctaDescription:
      "Book a walkthrough to align local qualification, quote management, and contract close activity.",
    nearbyCities: [
      { stateSlug: "washington", citySlug: "seattle", label: "Seattle, WA" },
      { stateSlug: "texas", citySlug: "dallas", label: "Dallas, TX" },
    ],
    relatedSaasLinks: DEFAULT_RELATED_SAAS_LINKS,
    keywords: [
      "Los Angeles commercial cleaning leads",
      "LA janitorial lead pipeline",
      "commercial cleaning software Los Angeles",
    ],
  },
  {
    stateSlug: "washington",
    citySlug: "seattle",
    cityName: "Seattle",
    stateName: "Washington",
    stateCode: "WA",
    heroTitle:
      "Commercial cleaning leads in Seattle, WA with accountable follow-up",
    heroDescription:
      "Manage Seattle opportunities with clearer qualification, practical territory ownership, and stronger quote follow-through.",
    marketOverview:
      "Seattle demand often emphasizes service quality, communication consistency, and long-term vendor reliability, especially in office and healthcare segments.",
    marketSignals: [
      "Stakeholders often value documented quality and escalation workflows.",
      "Teams that qualify fit early can protect estimator bandwidth.",
      "Reliable cadence across follow-up steps improves competitive outcomes.",
    ],
    whyServiceOs: [
      "Turn fragmented lead notes into a single operational workflow.",
      "Give every opportunity an owner and next-step deadline.",
      "Track outcomes to improve Seattle campaign and territory decisions.",
    ],
    howItWorks: [
      "Capture Seattle lead requests with structured intake criteria.",
      "Prioritize and route opportunities by fit and urgency.",
      "Execute quote follow-up with standardized milestone tracking.",
    ],
    faqs: [
      {
        question:
          "Can Service OS help small teams keep up with Seattle demand?",
        answer:
          "Yes. Standardized workflows and ownership clarity help smaller teams maintain consistent response quality.",
      },
      {
        question: "Does this content include any customer or private data?",
        answer:
          "No. The page is public educational content and contains no private customer or marketplace records.",
      },
      {
        question: "Can we tie lead intake to quote execution?",
        answer:
          "Yes. Service OS connects qualification details, next actions, and quote progression in one process.",
      },
    ],
    ctaTitle: "Improve Seattle lead conversion with repeatable execution",
    ctaDescription:
      "See how Service OS helps your team run disciplined local sales workflows from first inquiry to signed contract.",
    nearbyCities: [
      {
        stateSlug: "california",
        citySlug: "los-angeles",
        label: "Los Angeles, CA",
      },
      { stateSlug: "texas", citySlug: "austin", label: "Austin, TX" },
    ],
    relatedSaasLinks: DEFAULT_RELATED_SAAS_LINKS,
    keywords: [
      "Seattle commercial cleaning leads",
      "Seattle janitorial opportunity software",
      "cleaning CRM Seattle",
    ],
  },
];

export function buildMarketplaceCityPath(stateSlug: string, citySlug: string) {
  return `/commercial-cleaning-leads/${stateSlug}/${citySlug}`;
}

export function getMarketplaceCityPage(stateSlug: string, citySlug: string) {
  return (
    MARKETPLACE_CITY_PAGES.find(
      (page) => page.stateSlug === stateSlug && page.citySlug === citySlug,
    ) ?? null
  );
}

export function getMarketplaceCityStaticParams() {
  return MARKETPLACE_CITY_PAGES.map((page) => ({
    state: page.stateSlug,
    city: page.citySlug,
  }));
}

export function getMarketplaceCityPagePaths() {
  return MARKETPLACE_CITY_PAGES.map((page) =>
    buildMarketplaceCityPath(page.stateSlug, page.citySlug),
  );
}
