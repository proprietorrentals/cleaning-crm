export type LandingFaqItem = {
  question: string;
  answer: string;
};

export type LandingPageConfig = {
  path: string;
  title: string;
  description: string;
  eyebrow: string;
  heroTitle: string;
  heroDescription: string;
  benefits: string[];
  features: { title: string; description: string }[];
  howItWorks: string[];
  faqs: LandingFaqItem[];
  ctaTitle: string;
  ctaDescription: string;
  relatedLinks: { href: string; label: string }[];
  keywords: string[];
};

export const SAAS_LANDING_PAGES: LandingPageConfig[] = [
  {
    path: "/cleaning-crm",
    title: "Cleaning CRM for Commercial Teams | Service OS",
    description:
      "Service OS gives cleaning companies a purpose-built CRM to track leads, quotes, jobs, invoices, and team workflows in one place.",
    eyebrow: "SaaS",
    heroTitle: "Cleaning CRM built for commercial service teams",
    heroDescription:
      "Manage customer relationships, quoting, dispatch, invoicing, and renewals inside one connected CRM designed for commercial cleaning operations.",
    benefits: [
      "Track every lead from first inquiry to signed contract",
      "Keep quotes, jobs, invoices, and communication linked to each account",
      "Give office and field teams one source of truth",
    ],
    features: [
      {
        title: "Pipeline and quote visibility",
        description:
          "See where every opportunity sits and what needs follow-up next.",
      },
      {
        title: "Operations-linked customer records",
        description:
          "Connect client details to schedules, service history, and billing status.",
      },
      {
        title: "Team accountability",
        description:
          "Assign owners for every stage from lead response to invoice collection.",
      },
      {
        title: "Growth reporting",
        description:
          "Measure win rates, cycle time, and account expansion across your book.",
      },
    ],
    howItWorks: [
      "Capture inbound requests and assign them to your sales workflow.",
      "Build tailored commercial quotes and move approved work into scheduling.",
      "Track service delivery, invoicing, and account health in real time.",
    ],
    faqs: [
      {
        question: "Is Service OS only for residential cleaners?",
        answer:
          "No. Service OS is designed for commercial cleaning and janitorial teams that manage recurring contracts, larger facilities, and multi-role operations.",
      },
      {
        question: "Can I track both sales and operations in one place?",
        answer:
          "Yes. The CRM connects lead tracking, quoting, dispatch, and billing so your team can move from opportunity to completed job without tool switching.",
      },
      {
        question: "Does it support growing teams?",
        answer:
          "Service OS supports role-based workflows for office, field, and leadership teams as operations scale.",
      },
    ],
    ctaTitle: "See how a commercial cleaning CRM should work",
    ctaDescription:
      "Book a demo and walk through your lead-to-job process with Service OS.",
    relatedLinks: [
      {
        href: "/commercial-cleaning-software",
        label: "Commercial Cleaning Software",
      },
      { href: "/janitorial-crm", label: "Janitorial CRM" },
    ],
    keywords: [
      "cleaning CRM",
      "commercial cleaning CRM",
      "janitorial CRM software",
    ],
  },
  {
    path: "/commercial-cleaning-software",
    title: "Commercial Cleaning Software for Growth | Service OS",
    description:
      "Run commercial cleaning sales, scheduling, field execution, and billing from one platform built for recurring contracts and operational control.",
    eyebrow: "SaaS",
    heroTitle: "Commercial cleaning software for end-to-end operations",
    heroDescription:
      "Service OS helps commercial cleaning businesses standardize how they win work, schedule crews, verify service quality, and collect payments.",
    benefits: [
      "Reduce handoff errors between sales, dispatch, and field teams",
      "Improve job visibility across multiple crews and locations",
      "Standardize systems so growth does not break operations",
    ],
    features: [
      {
        title: "Quote-to-schedule workflow",
        description:
          "Convert approved proposals directly into operations plans.",
      },
      {
        title: "Field execution tracking",
        description:
          "Monitor arrivals, progress, and completion signals in real time.",
      },
      {
        title: "Invoice readiness controls",
        description: "Keep billing aligned with completed and verified work.",
      },
      {
        title: "Operational reporting",
        description:
          "Review utilization, completion quality, and revenue movement.",
      },
    ],
    howItWorks: [
      "Centralize sales opportunities and facility requirements.",
      "Coordinate schedules, assignments, and service standards.",
      "Track completion outcomes and invoice performance by account.",
    ],
    faqs: [
      {
        question: "Can this replace multiple disconnected tools?",
        answer:
          "Yes. Service OS is built to unify CRM, scheduling, operational tracking, and invoicing for commercial cleaning providers.",
      },
      {
        question: "Is it suitable for multi-location clients?",
        answer:
          "Yes. You can organize workflows by customer, property, and service cadence to manage complex portfolios.",
      },
      {
        question: "Does it support recurring contracts?",
        answer:
          "Yes. Recurring service planning and account-level visibility are core use cases for Service OS.",
      },
    ],
    ctaTitle: "Run your operation on one commercial cleaning platform",
    ctaDescription:
      "See Service OS in action across sales, scheduling, field execution, and billing.",
    relatedLinks: [
      {
        href: "/cleaning-business-management-software",
        label: "Cleaning Business Management Software",
      },
      {
        href: "/ai-cleaning-business-software",
        label: "AI Cleaning Business Software",
      },
    ],
    keywords: [
      "commercial cleaning software",
      "janitorial management software",
      "cleaning business software",
    ],
  },
  {
    path: "/janitorial-crm",
    title: "Janitorial CRM for Contract Cleaning Companies | Service OS",
    description:
      "Service OS is a janitorial CRM for managing bids, client communication, service delivery, and account retention in commercial cleaning.",
    eyebrow: "SaaS",
    heroTitle: "Janitorial CRM designed for contract cleaning teams",
    heroDescription:
      "Keep contract details, service requirements, and communication history organized so teams can execute consistently and retain accounts longer.",
    benefits: [
      "Protect account quality with structured customer records",
      "Improve response speed with centralized communication context",
      "Reduce churn through visible service and billing follow-through",
    ],
    features: [
      {
        title: "Bid and renewal visibility",
        description:
          "Track opportunities, renewals, and expansion paths by account.",
      },
      {
        title: "Client communication timeline",
        description:
          "Keep every promise, request, and update attached to the right record.",
      },
      {
        title: "Service quality checkpoints",
        description:
          "Tie delivery milestones to account status and follow-up actions.",
      },
      {
        title: "Retention insights",
        description:
          "Spot at-risk accounts earlier with operational and billing signals.",
      },
    ],
    howItWorks: [
      "Capture and qualify janitorial opportunities from your preferred channels.",
      "Manage account onboarding, scope approvals, and recurring schedules.",
      "Track service outcomes and keep customer follow-up on schedule.",
    ],
    faqs: [
      {
        question: "Who is this janitorial CRM built for?",
        answer:
          "Service OS is built for commercial and janitorial providers handling recurring service contracts and multi-team operations.",
      },
      {
        question: "Can I manage account renewals in the system?",
        answer:
          "Yes. Service OS supports contract lifecycle visibility, including renewal planning and follow-up workflows.",
      },
      {
        question: "Does it help with customer retention?",
        answer:
          "Yes. By linking communication, service quality, and billing signals, your team can proactively address account risk.",
      },
    ],
    ctaTitle: "Upgrade from a generic CRM to janitorial-first workflows",
    ctaDescription:
      "Schedule a demo to see janitorial account workflows tailored to your business.",
    relatedLinks: [
      { href: "/cleaning-crm", label: "Cleaning CRM" },
      {
        href: "/commercial-cleaning-software",
        label: "Commercial Cleaning Software",
      },
    ],
    keywords: [
      "janitorial CRM",
      "contract cleaning CRM",
      "cleaning CRM platform",
    ],
  },
  {
    path: "/cleaning-business-management-software",
    title: "Cleaning Business Management Software | Service OS",
    description:
      "Manage commercial cleaning growth with software that connects CRM, dispatch, quality controls, team accountability, and revenue operations.",
    eyebrow: "SaaS",
    heroTitle: "Cleaning business management software for scalable operations",
    heroDescription:
      "Service OS gives owners and managers one platform to align sales, service delivery, and financial workflows as teams and territories grow.",
    benefits: [
      "Scale with consistent systems across departments",
      "Improve visibility from lead activity to completed service",
      "Raise operational discipline with clear ownership",
    ],
    features: [
      {
        title: "Unified management dashboard",
        description:
          "Monitor sales, operations, and billing metrics side by side.",
      },
      {
        title: "Role-based execution",
        description:
          "Support office, field, and leadership workflows without duplication.",
      },
      {
        title: "Service quality control",
        description:
          "Track completion standards and follow-up tasks systematically.",
      },
      {
        title: "Revenue operations visibility",
        description:
          "See quote conversion, invoice status, and account trends in one place.",
      },
    ],
    howItWorks: [
      "Standardize your lead intake and quoting process.",
      "Coordinate job scheduling and field execution by account.",
      "Use reporting to improve margins, quality, and retention.",
    ],
    faqs: [
      {
        question: "Can Service OS support both small and larger teams?",
        answer:
          "Yes. The platform supports structured workflows that work for lean teams and scale as your operation adds staff and accounts.",
      },
      {
        question: "Does it include tools beyond CRM?",
        answer:
          "Yes. Service OS includes operational planning, execution tracking, and billing-adjacent workflows alongside CRM capabilities.",
      },
      {
        question: "Is this software focused on cleaning businesses?",
        answer:
          "Yes. Product workflows and language are built around commercial cleaning and janitorial management needs.",
      },
    ],
    ctaTitle: "Run your cleaning business with connected systems",
    ctaDescription:
      "Book a walkthrough and map Service OS to your current operating model.",
    relatedLinks: [
      {
        href: "/ai-cleaning-business-software",
        label: "AI Cleaning Business Software",
      },
      { href: "/janitorial-crm", label: "Janitorial CRM" },
    ],
    keywords: [
      "cleaning business management software",
      "commercial cleaning operations software",
      "janitorial management platform",
    ],
  },
  {
    path: "/ai-cleaning-business-software",
    title: "AI Cleaning Business Software for Commercial Teams | Service OS",
    description:
      "Use AI-enabled cleaning business software to improve follow-up speed, operational consistency, and decision-making across commercial accounts.",
    eyebrow: "SaaS",
    heroTitle: "AI cleaning business software that supports real operations",
    heroDescription:
      "Service OS combines practical automation with human oversight so cleaning teams can move faster without losing control.",
    benefits: [
      "Accelerate repetitive coordination tasks across teams",
      "Get faster operational signals for decision-making",
      "Keep managers in control of final actions and approvals",
    ],
    features: [
      {
        title: "AI-assisted follow-up workflows",
        description: "Speed up outreach while maintaining account context.",
      },
      {
        title: "Operational summaries",
        description:
          "Surface key trends across jobs, teams, and accounts quickly.",
      },
      {
        title: "Priority guidance",
        description: "Focus leaders on the highest-impact operational actions.",
      },
      {
        title: "Human-in-the-loop controls",
        description:
          "Review and approve before customer-facing actions are finalized.",
      },
    ],
    howItWorks: [
      "Connect sales and operations workflows in Service OS.",
      "Use AI support for repeatable coordination and insight generation.",
      "Apply manager review to keep quality and brand standards high.",
    ],
    faqs: [
      {
        question: "Does AI replace my team?",
        answer:
          "No. Service OS uses AI to assist your team with speed and prioritization while keeping people in control of key decisions.",
      },
      {
        question: "Can we adopt AI workflows gradually?",
        answer:
          "Yes. Teams can start with targeted use cases and expand as process confidence grows.",
      },
      {
        question: "Is this relevant for commercial cleaning operations?",
        answer:
          "Yes. AI support is applied to cleaning-specific workflows such as lead response, scheduling context, and operational monitoring.",
      },
    ],
    ctaTitle: "See practical AI workflows for cleaning companies",
    ctaDescription:
      "Explore how Service OS uses AI to improve speed and consistency without sacrificing control.",
    relatedLinks: [
      {
        href: "/commercial-cleaning-software",
        label: "Commercial Cleaning Software",
      },
      {
        href: "/cleaning-business-management-software",
        label: "Business Management Software",
      },
    ],
    keywords: [
      "AI cleaning business software",
      "AI tools for cleaning companies",
      "commercial cleaning automation",
    ],
  },
];

export const MARKETPLACE_LANDING_PAGES: LandingPageConfig[] = [
  {
    path: "/commercial-cleaning-leads",
    title: "Commercial Cleaning Leads for Service Companies | Service OS",
    description:
      "Get commercial cleaning leads through Service OS and respond faster with CRM-connected workflows built for qualification, quoting, and conversion.",
    eyebrow: "Marketplace",
    heroTitle: "Commercial cleaning leads connected to your CRM workflow",
    heroDescription:
      "Service OS helps commercial cleaning teams capture demand, qualify opportunities, and convert more leads into profitable recurring contracts.",
    benefits: [
      "Respond faster to high-intent lead inquiries",
      "Keep lead context tied to quoting and follow-up",
      "Improve conversion with consistent response workflows",
    ],
    features: [
      {
        title: "Lead intake and qualification",
        description:
          "Capture request details needed for fast commercial follow-up.",
      },
      {
        title: "Territory and service-fit context",
        description: "Prioritize leads that match your ideal contract profile.",
      },
      {
        title: "CRM-connected follow-up",
        description:
          "Move opportunities into sales workflows without manual re-entry.",
      },
      {
        title: "Conversion tracking",
        description: "Measure response speed, quote outcomes, and win rates.",
      },
    ],
    howItWorks: [
      "Collect inbound commercial cleaning requests through public channels.",
      "Review lead fit and route qualified opportunities to your team.",
      "Track outcomes from first response through closed contract.",
    ],
    faqs: [
      {
        question: "Are these leads connected to Service OS CRM workflows?",
        answer:
          "Yes. Lead records can flow directly into your CRM process for qualification, quoting, and follow-up.",
      },
      {
        question: "Can I focus only on relevant commercial opportunities?",
        answer:
          "Yes. Teams can prioritize opportunities based on service fit, territory, and contract potential.",
      },
      {
        question:
          "Does Service OS expose private marketplace inventory publicly?",
        answer:
          "No. Public landing pages describe capabilities but do not expose private or authenticated marketplace inventory.",
      },
    ],
    ctaTitle: "Turn more commercial cleaning leads into contracts",
    ctaDescription:
      "See how Service OS connects lead generation with clean sales execution.",
    relatedLinks: [
      { href: "/office-cleaning-leads", label: "Office Cleaning Leads" },
      {
        href: "/medical-office-cleaning-leads",
        label: "Medical Office Cleaning Leads",
      },
    ],
    keywords: [
      "commercial cleaning leads",
      "cleaning lead generation",
      "janitorial sales leads",
    ],
  },
  {
    path: "/office-cleaning-leads",
    title: "Office Cleaning Leads for Commercial Contracts | Service OS",
    description:
      "Find office cleaning leads and manage follow-up from first inquiry to signed agreement with Service OS lead and CRM workflows.",
    eyebrow: "Marketplace",
    heroTitle: "Office cleaning leads built for contract growth",
    heroDescription:
      "Service OS helps your team qualify office cleaning opportunities quickly and move the right prospects into quote-ready workflows.",
    benefits: [
      "Prioritize office opportunities aligned to your service model",
      "Shorten response times with structured intake data",
      "Increase office contract win rates through consistent follow-up",
    ],
    features: [
      {
        title: "Office-specific intake signals",
        description:
          "Capture facility size, schedule cadence, and scope requirements.",
      },
      {
        title: "Qualification workflows",
        description:
          "Route better-fit office opportunities to the right sales owner.",
      },
      {
        title: "Proposal handoff support",
        description:
          "Connect lead records to quoting and scheduling preparation.",
      },
      {
        title: "Pipeline performance insight",
        description:
          "Review office lead speed-to-quote and conversion outcomes.",
      },
    ],
    howItWorks: [
      "Capture office cleaning requests through Service OS channels.",
      "Qualify opportunities and organize next actions by account priority.",
      "Track progress to quote and contract conversion.",
    ],
    faqs: [
      {
        question: "Can we focus specifically on office cleaning opportunities?",
        answer:
          "Yes. Service OS supports targeted workflows for office-focused lead qualification and follow-up.",
      },
      {
        question: "Do lead records integrate with quote workflows?",
        answer:
          "Yes. Teams can move qualified leads directly into CRM and quoting stages.",
      },
      {
        question: "Is this only for large companies?",
        answer:
          "No. Service OS supports both growing and established commercial cleaning providers.",
      },
    ],
    ctaTitle: "Win more office cleaning contracts",
    ctaDescription:
      "Explore Service OS workflows for office lead qualification and faster follow-up.",
    relatedLinks: [
      {
        href: "/commercial-cleaning-leads",
        label: "Commercial Cleaning Leads",
      },
      { href: "/school-cleaning-leads", label: "School Cleaning Leads" },
    ],
    keywords: [
      "office cleaning leads",
      "commercial office cleaning leads",
      "janitorial office contracts",
    ],
  },
  {
    path: "/medical-office-cleaning-leads",
    title: "Medical Office Cleaning Leads | Service OS",
    description:
      "Generate and manage medical office cleaning leads with workflows that support qualification, compliance context, and rapid follow-up.",
    eyebrow: "Marketplace",
    heroTitle:
      "Medical office cleaning leads with better qualification context",
    heroDescription:
      "Service OS helps teams handle specialized medical office opportunities with clearer requirements and disciplined follow-up execution.",
    benefits: [
      "Capture key service requirements for medical environments",
      "Improve handoffs between lead qualification and proposal prep",
      "Reduce missed follow-up on high-value medical opportunities",
    ],
    features: [
      {
        title: "Specialized intake fields",
        description:
          "Collect schedule, facility, and scope context for medical spaces.",
      },
      {
        title: "Qualification checkpoints",
        description: "Validate fit before investing full proposal effort.",
      },
      {
        title: "CRM-linked proposal workflow",
        description:
          "Keep opportunity details available across sales and operations.",
      },
      {
        title: "Activity visibility",
        description:
          "Track response quality and contract outcomes by lead source.",
      },
    ],
    howItWorks: [
      "Capture medical office demand with relevant business context.",
      "Qualify opportunities and align next steps with your process.",
      "Track proposal progress and conversion metrics over time.",
    ],
    faqs: [
      {
        question:
          "Can these workflows support specialized cleaning requirements?",
        answer:
          "Yes. Service OS helps teams capture and review detailed lead context before proposal delivery.",
      },
      {
        question:
          "Does this expose customer-sensitive lead information publicly?",
        answer:
          "No. Public pages describe capability only and do not reveal private lead records.",
      },
      {
        question: "Can we monitor conversion performance for medical leads?",
        answer:
          "Yes. Service OS provides pipeline visibility from inquiry through contract outcome.",
      },
    ],
    ctaTitle: "Handle medical office opportunities with more confidence",
    ctaDescription:
      "See how Service OS structures medical lead workflows for speed and clarity.",
    relatedLinks: [
      { href: "/office-cleaning-leads", label: "Office Cleaning Leads" },
      { href: "/warehouse-cleaning-leads", label: "Warehouse Cleaning Leads" },
    ],
    keywords: [
      "medical office cleaning leads",
      "healthcare janitorial leads",
      "commercial cleaning lead generation",
    ],
  },
  {
    path: "/warehouse-cleaning-leads",
    title: "Warehouse Cleaning Leads for Commercial Providers | Service OS",
    description:
      "Grow warehouse service revenue with lead workflows that help qualify facility scope, scheduling complexity, and contract fit.",
    eyebrow: "Marketplace",
    heroTitle: "Warehouse cleaning leads with clear operational context",
    heroDescription:
      "Service OS helps commercial teams evaluate warehouse opportunities quickly and move the right prospects into structured sales execution.",
    benefits: [
      "Qualify warehouse opportunities with scope clarity",
      "Improve response consistency on large-facility requests",
      "Track warehouse pipeline and contract outcomes",
    ],
    features: [
      {
        title: "Facility context capture",
        description:
          "Collect details that impact staffing, cadence, and pricing strategy.",
      },
      {
        title: "Lead prioritization support",
        description:
          "Focus on opportunities that match your operational strengths.",
      },
      {
        title: "Integrated follow-up workflow",
        description:
          "Move from inquiry to quoting within one connected process.",
      },
      {
        title: "Outcome reporting",
        description:
          "Measure conversion and cycle-time performance for warehouse leads.",
      },
    ],
    howItWorks: [
      "Ingest warehouse lead requests through public channels.",
      "Review fit and assign sales actions using standardized criteria.",
      "Track proposal and contract outcomes to refine performance.",
    ],
    faqs: [
      {
        question: "Can we screen warehouse leads before full quoting?",
        answer:
          "Yes. Service OS supports qualification checkpoints to ensure opportunities match your service and margin goals.",
      },
      {
        question: "Will this integrate with our existing Service OS workflows?",
        answer:
          "Yes. Lead data can feed directly into CRM and operational planning workflows.",
      },
      {
        question: "Are warehouse leads visible publicly on this page?",
        answer:
          "No. This page is informational and does not expose private lead inventory.",
      },
    ],
    ctaTitle: "Convert more warehouse opportunities with structured workflows",
    ctaDescription:
      "Book a demo to see warehouse lead management inside Service OS.",
    relatedLinks: [
      {
        href: "/commercial-cleaning-leads",
        label: "Commercial Cleaning Leads",
      },
      { href: "/school-cleaning-leads", label: "School Cleaning Leads" },
    ],
    keywords: [
      "warehouse cleaning leads",
      "industrial janitorial leads",
      "commercial facility cleaning leads",
    ],
  },
  {
    path: "/school-cleaning-leads",
    title: "School Cleaning Leads for Janitorial Teams | Service OS",
    description:
      "Find and manage school cleaning leads with workflows that support scheduling windows, service requirements, and contract conversion.",
    eyebrow: "Marketplace",
    heroTitle: "School cleaning leads managed with contract-ready workflows",
    heroDescription:
      "Service OS helps janitorial teams evaluate and convert school cleaning opportunities while keeping sales and operations aligned.",
    benefits: [
      "Capture school-specific scope and schedule constraints",
      "Align quoting and operations before contract commitment",
      "Improve consistency in school opportunity follow-up",
    ],
    features: [
      {
        title: "Education facility lead intake",
        description:
          "Collect practical context for recurring school service planning.",
      },
      {
        title: "Qualification and routing",
        description:
          "Assign leads to owners based on territory and service fit.",
      },
      {
        title: "Connected sales workflows",
        description: "Keep lead records tied to CRM and proposal activity.",
      },
      {
        title: "Performance tracking",
        description:
          "Measure lead response and conversion for school contracts.",
      },
    ],
    howItWorks: [
      "Capture school facility lead demand through Service OS pages.",
      "Review requirements and route qualified opportunities.",
      "Track quote progress and contract close outcomes.",
    ],
    faqs: [
      {
        question: "Can we use this for recurring school contracts?",
        answer:
          "Yes. Service OS supports recurring commercial contract workflows, including school-focused opportunities.",
      },
      {
        question: "Does Service OS provide follow-up structure for busy teams?",
        answer:
          "Yes. The platform supports standardized next steps and visibility so leads are less likely to stall.",
      },
      {
        question: "Is private marketplace inventory publicly visible?",
        answer:
          "No. Public landing pages do not expose private or authenticated marketplace inventory.",
      },
    ],
    ctaTitle: "Grow school cleaning contracts with better lead execution",
    ctaDescription:
      "See how Service OS connects school lead intake to CRM conversion workflows.",
    relatedLinks: [
      { href: "/office-cleaning-leads", label: "Office Cleaning Leads" },
      {
        href: "/medical-office-cleaning-leads",
        label: "Medical Office Cleaning Leads",
      },
    ],
    keywords: [
      "school cleaning leads",
      "education facility janitorial leads",
      "commercial cleaning leads",
    ],
  },
];

export const ALL_LANDING_PAGES: LandingPageConfig[] = [
  ...SAAS_LANDING_PAGES,
  ...MARKETPLACE_LANDING_PAGES,
];

export function getLandingPageByPath(path: string) {
  return ALL_LANDING_PAGES.find((page) => page.path === path) ?? null;
}

export function requireLandingPageByPath(path: string): LandingPageConfig {
  const config = getLandingPageByPath(path);
  if (!config) {
    throw new Error(`Missing landing page config for ${path}`);
  }

  return config;
}
