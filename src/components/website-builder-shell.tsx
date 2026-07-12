"use client";

import { createClient } from "@/lib/supabase/client";
import { ServiceOSBrand } from "@/components/serviceos-brand";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type WebsiteTemplate = {
  name: string;
  description: string;
  accent: string;
};

type WebsitePage = {
  name: string;
  purpose: string;
};

type CustomizationItem = {
  name: string;
  detail: string;
};

type BuilderStatus = {
  websiteStatus: string;
  currentDomain: string;
  publishStatus: string;
  lastPublishedAt: string | null;
};

type CRMLeadState = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  serviceType: string;
  notes: string;
};

const templates: WebsiteTemplate[] = [
  {
    name: "Commercial Cleaning",
    description: "Built for recurring B2B service routes, facility relationships, and fast quote conversion.",
    accent: "from-blue-600 to-sky-400",
  },
  {
    name: "Janitorial",
    description: "Structured for multi-site staffing, nightly service schedules, and contract-based work.",
    accent: "from-slate-900 to-slate-600",
  },
  {
    name: "Office Cleaning",
    description: "Designed to highlight reliability, recurring plans, and low-friction quote requests.",
    accent: "from-cyan-700 to-blue-500",
  },
  {
    name: "Residential Cleaning",
    description: "Focused on trust, convenience, and easy conversion from home service interest to booking.",
    accent: "from-emerald-600 to-teal-400",
  },
  {
    name: "Pressure Washing",
    description: "Optimized for before/after visuals, quick quote capture, and seasonal campaigns.",
    accent: "from-amber-600 to-orange-400",
  },
  {
    name: "Carpet Cleaning",
    description: "Highlights results, specialty service pages, and lead capture for estimates and follow-up.",
    accent: "from-violet-700 to-fuchsia-500",
  },
];

const pages: WebsitePage[] = [
  { name: "Home", purpose: "Hero, trust signals, and primary conversion actions." },
  { name: "About", purpose: "Brand story, service coverage, and team credibility." },
  { name: "Services", purpose: "Service catalog with structured detail and booking prompts." },
  { name: "Gallery", purpose: "Before/after images and proof of work." },
  { name: "Quote Request", purpose: "Capture leads and automatically create CRM records." },
  { name: "Contact", purpose: "Direct communication, phone, email, and location details." },
];

const customization: CustomizationItem[] = [
  { name: "Logo", detail: "Upload a brand mark and use it across the site header and footer." },
  { name: "Colors", detail: "Set blue/navy brand colors, section backgrounds, and call-to-action tones." },
  { name: "Fonts", detail: "Reuse the app typography or select future theme presets." },
  { name: "Hero image", detail: "Swap in a campaign image, team photo, or service hero visual." },
  { name: "Business information", detail: "Manage company name, hours, service area, and office details." },
  { name: "Service list", detail: "Curate the services you want featured on the public site." },
  { name: "Contact details", detail: "Set phone, email, and quote-request routing information." },
  { name: "Social media", detail: "Store social links for future footer and header use." },
];

const sidebarItems = [
  { label: "Dashboard", href: "/", icon: "▣" },
  { label: "Customers", href: "/customers", icon: "◫" },
  { label: "Quotes", href: "/quotes", icon: "◧" },
  { label: "Jobs", href: "/jobs", icon: "◔" },
  { label: "Employees", href: "/employees", icon: "◍" },
  { label: "Invoices", href: "/invoices", icon: "◐" },
  { label: "Schedule", href: "/schedule", icon: "◕" },
  { label: "Website Builder", href: "/website-builder", icon: "✦", active: true },
  { label: "Reports", href: "/reports", icon: "◑" },
  { label: "Settings", href: "/settings", icon: "⚙" },
];

const serviceOptions = [
  "Commercial Cleaning",
  "Janitorial",
  "Office Cleaning",
  "Residential Cleaning",
  "Pressure Washing",
  "Carpet Cleaning",
  "Other",
];

function makeBlankLead(): CRMLeadState {
  return {
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    serviceType: serviceOptions[0],
    notes: "",
  };
}

export function WebsiteBuilderShell() {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<BuilderStatus>({
    websiteStatus: "Ready to build",
    currentDomain: "Loading...",
    publishStatus: "Draft",
    lastPublishedAt: null,
  });
  const [leadForm, setLeadForm] = useState<CRMLeadState>(makeBlankLead());
  const [loading, setLoading] = useState(true);
  const [savingLead, setSavingLead] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [leadMessage, setLeadMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadStatus = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      const currentDomain = typeof window !== "undefined" ? window.location.host : "app.serviceos.com";

      if (!user) {
        setStatus((current) => ({ ...current, currentDomain }));
        setLoading(false);
        return;
      }

      const { data: settings } = await supabase
        .from("settings")
        .select("company_name,company_phone,company_email,company_logo_url,updated_at")
        .maybeSingle();

      const { data: adminRow } = await supabase
        .from("tenant_admins")
        .select("tenant_id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      setStatus({
        websiteStatus: settings?.company_name ? `${settings.company_name} draft` : "Draft",
        currentDomain,
        publishStatus: "Not published",
        lastPublishedAt: null,
      });

      if (adminRow) {
        setPublishMessage(null);
      }

      setLoading(false);
    };

    loadStatus();
  }, [supabase]);

  const handlePublish = async () => {
    setPublishMessage("Publishing workflow coming next. Custom domain support coming next.");
    setStatus((current) => ({
      ...current,
      publishStatus: "Queued",
    }));
  };

  const handleLeadSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingLead(true);
    setLeadMessage(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        setLeadMessage("Please sign in as an admin to capture website leads.");
        setSavingLead(false);
        return;
      }

      const { data: adminRow, error: adminError } = await supabase
        .from("tenant_admins")
        .select("tenant_id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (adminError || !adminRow?.tenant_id) {
        setLeadMessage("Unable to resolve tenant for lead capture.");
        setSavingLead(false);
        return;
      }

      const customerPayload = {
        tenant_id: adminRow.tenant_id,
        company_name: leadForm.companyName.trim(),
        contact_name: leadForm.contactName.trim(),
        phone: leadForm.phone.trim() || null,
        email: leadForm.email.trim(),
        address: null,
        building_size: null,
        cleaning_frequency: null,
        notes: leadForm.notes.trim() || `Website quote request for ${leadForm.serviceType}`,
      };

      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .insert(customerPayload)
        .select("id")
        .single();

      if (customerError || !customer?.id) {
        setLeadMessage(`Failed to create CRM lead: ${customerError?.message ?? "Unknown error"}`);
        setSavingLead(false);
        return;
      }

      const { error: serviceRequestError } = await supabase.from("service_requests").insert({
        customer_id: customer.id,
        service_type: `${leadForm.serviceType} Quote Request`,
        preferred_date: null,
        notes: leadForm.notes.trim() || `Auto-captured from website builder for ${leadForm.companyName.trim()}.`,
        status: "pending",
      });

      if (serviceRequestError) {
        setLeadMessage(`Lead created but request log failed: ${serviceRequestError.message}`);
        setSavingLead(false);
        return;
      }

      setLeadMessage("CRM lead created from the quote request capture flow.");
      setLeadForm(makeBlankLead());
    } catch (error) {
      setLeadMessage(error instanceof Error ? error.message : "Unexpected lead capture error.");
    } finally {
      setSavingLead(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e8f5ff_0%,#f8fbff_55%,#f5f8ff_100%)] text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-slate-200/80 bg-white/80 px-5 py-6 backdrop-blur lg:w-64 lg:border-b-0 lg:border-r lg:px-6">
          <ServiceOSBrand />
          <nav className="mt-8 space-y-1">
            {sidebarItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  item.active
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <header className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white/90 px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="text-sm font-medium text-sky-700">Website Builder</p>
              <h1 className="text-2xl font-semibold text-slate-900">Design your public ServiceOS site</h1>
              <p className="mt-1 text-sm text-slate-600">Custom domain support coming next.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handlePublish}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Publish
              </button>
              <Link
                href="/contact"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                View Contact Page
              </Link>
            </div>
          </header>

          {publishMessage ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {publishMessage}
            </div>
          ) : null}

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Website Status", value: loading ? "Loading..." : status.websiteStatus, tone: "text-sky-700" },
              { label: "Current Domain", value: loading ? "Loading..." : status.currentDomain, tone: "text-slate-900" },
              { label: "Publish Status", value: loading ? "Loading..." : status.publishStatus, tone: "text-emerald-700" },
              { label: "Last Published", value: status.lastPublishedAt ?? "Never published", tone: "text-violet-700" },
            ].map((card) => (
              <article key={card.label} className="rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
                <p className={`mt-2 text-xl font-semibold ${card.tone}`}>{card.value}</p>
              </article>
            ))}
          </section>

          <section className="mt-6 rounded-3xl border border-blue-200/80 bg-white/95 p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Templates</p>
                <h2 className="text-xl font-semibold text-slate-900">Launch-ready starter themes</h2>
                <p className="mt-1 text-sm text-slate-600">Choose a foundation and customize it for your service business.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {templates.map((template) => (
                <article key={template.name} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
                  <div className={`h-2 bg-gradient-to-r ${template.accent}`} />
                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-slate-900">{template.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{template.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Website Pages</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Supported page structure</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {pages.map((page) => (
                  <div key={page.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">{page.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{page.purpose}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Publishing</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Placeholder workflow only</h2>
              <p className="mt-2 text-sm text-slate-600">
                Publish remains a foundation feature for now. Live hosting and DNS configuration are not enabled yet.
              </p>
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                Custom domain support coming next.
              </div>
            </article>
          </section>

          <section className="mt-6 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Customization</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Core website controls</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {customization.map((item) => (
                <article key={item.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
            <article className="rounded-3xl border border-emerald-200/70 bg-white/95 p-6 shadow-sm">
              <p className="text-sm font-medium text-emerald-700">Lead Capture</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Quote requests become CRM leads automatically</h2>
              <p className="mt-2 text-sm text-slate-600">
                Quote request submissions are written into the existing CRM flow by creating a customer record and a linked service request.
              </p>
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                CRM integration uses the current customers and service_requests tables. No new lead table required.
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Quote Request Preview</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Capture a test CRM lead</h2>
              <form onSubmit={handleLeadSubmit} className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    value={leadForm.companyName}
                    onChange={(event) => setLeadForm((current) => ({ ...current, companyName: event.target.value }))}
                    placeholder="Company name"
                    required
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <input
                    value={leadForm.contactName}
                    onChange={(event) => setLeadForm((current) => ({ ...current, contactName: event.target.value }))}
                    placeholder="Contact name"
                    required
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    type="email"
                    value={leadForm.email}
                    onChange={(event) => setLeadForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="Email"
                    required
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <input
                    value={leadForm.phone}
                    onChange={(event) => setLeadForm((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="Phone (optional)"
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <select
                  value={leadForm.serviceType}
                  onChange={(event) => setLeadForm((current) => ({ ...current, serviceType: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {serviceOptions.map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
                <textarea
                  value={leadForm.notes}
                  onChange={(event) => setLeadForm((current) => ({ ...current, notes: event.target.value }))}
                  rows={4}
                  placeholder="Project details, scope, or quote notes"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                {leadMessage ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    {leadMessage}
                  </div>
                ) : null}
                <button
                  type="submit"
                  disabled={savingLead}
                  className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {savingLead ? "Capturing..." : "Save Quote Request Lead"}
                </button>
              </form>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}
