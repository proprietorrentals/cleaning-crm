"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ServiceOSLogo } from "@/components/serviceos-logo";
import { useI18n } from "@/components/i18n-provider";
import { trackAnalyticsEvent } from "@/lib/analytics";

type SalesLeadStatus =
  | "new"
  | "contacted"
  | "demo_scheduled"
  | "proposal_sent"
  | "won"
  | "lost";

type SalesLeadSource = "website" | "website_contact" | "demo_request" | "founding_partner" | "free_trial";

type SalesLeadRow = {
  id: string;
  tenant_id: string;
  contact_name: string;
  company_name: string | null;
  email: string;
  phone: string | null;
  employee_count: string | null;
  business_type: string | null;
  current_software: string | null;
  message: string | null;
  source: SalesLeadSource;
  status: SalesLeadStatus;
  assigned_to: string | null;
  next_follow_up_at: string | null;
  demo_scheduled_at: string | null;
  proposal_amount: number | null;
  lost_reason: string | null;
  founding_partner_interest: boolean;
  internal_notes: string | null;
  converted_customer_id: string | null;
  created_at: string;
  updated_at: string;
};

type StatusHistoryRow = {
  id: string;
  lead_id: string;
  from_status: SalesLeadStatus | null;
  to_status: SalesLeadStatus;
  changed_at: string;
};

type EmployeeRow = {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
};

type ContextState = {
  tenantId: string;
  userId: string;
  canManageSales: boolean;
  isTenantAdmin: boolean;
  roleLabel: string;
};

const STATUSES: SalesLeadStatus[] = ["new", "contacted", "demo_scheduled", "proposal_sent", "won", "lost"];

const SOURCES: SalesLeadSource[] = ["website_contact", "demo_request", "founding_partner", "free_trial", "website"];

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Customers", href: "/customers" },
  { label: "Quotes", href: "/quotes" },
  { label: "Jobs", href: "/jobs" },
  { label: "Employees", href: "/employees" },
  { label: "Invoices", href: "/invoices" },
  { label: "Schedule", href: "/schedule" },
  { label: "Leads", href: "/leads", active: true },
  { label: "Website Builder", href: "/website-builder" },
  { label: "Operations Center", href: "/operations-center" },
  { label: "Tasks", href: "/tasks" },
  { label: "Reports", href: "/reports" },
  { label: "Settings", href: "/settings" },
];

function isSupervisorRole(role: string | null | undefined) {
  const normalized = (role ?? "").toLowerCase();
  return normalized === "supervisor" || normalized === "manager";
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function normalize(value: string | null | undefined) {
  return (value ?? "").toLowerCase();
}

function toDatetimeLocalValue(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const tzOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

function fromDatetimeLocalValue(value: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export default function LeadsPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [context, setContext] = useState<ContextState | null>(null);

  const [leads, setLeads] = useState<SalesLeadRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [historyByLead, setHistoryByLead] = useState<Record<string, StatusHistoryRow[]>>({});

  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [foundingFilter, setFoundingFilter] = useState<string>("");
  const [assignedFilter, setAssignedFilter] = useState<string>("");
  const [followUpFilter, setFollowUpFilter] = useState<string>("");

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<SalesLeadStatus>("new");
  const [draftAssignedTo, setDraftAssignedTo] = useState<string>("");
  const [draftFollowUp, setDraftFollowUp] = useState<string>("");
  const [draftDemoAt, setDraftDemoAt] = useState<string>("");
  const [draftProposalAmount, setDraftProposalAmount] = useState<string>("");
  const [draftLostReason, setDraftLostReason] = useState<string>("");
  const [draftNotes, setDraftNotes] = useState<string>("");

  const loadData = async () => {
    setLoading(true);
    setError(null);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      setError(sessionError.message);
      setLoading(false);
      return;
    }

    const userId = session?.user?.id;
    if (!userId) {
      router.replace("/admin-login");
      return;
    }

    const [{ data: adminRow, error: adminError }, { data: employeeRow, error: employeeError }] = await Promise.all([
      supabase.from("tenant_admins").select("tenant_id").eq("auth_user_id", userId).maybeSingle(),
      supabase
        .from("employees")
        .select("tenant_id,role,is_active")
        .eq("auth_user_id", userId)
        .eq("is_active", true)
        .maybeSingle(),
    ]);

    if (adminError || employeeError) {
      setError(adminError?.message ?? employeeError?.message ?? "Unable to resolve user context.");
      setLoading(false);
      return;
    }

    const tenantId = adminRow?.tenant_id ?? employeeRow?.tenant_id ?? null;
    const canManageSales = Boolean(adminRow) || isSupervisorRole(employeeRow?.role);

    if (!tenantId || !canManageSales) {
      setError("You do not have access to the Sales Pipeline.");
      setLoading(false);
      return;
    }

    setContext({
      tenantId,
      userId,
      canManageSales,
      isTenantAdmin: Boolean(adminRow),
      roleLabel: adminRow ? "Tenant Admin" : employeeRow?.role ?? "Manager",
    });

    const [{ data: leadRows, error: leadError }, { data: employeeRows, error: empError }] = await Promise.all([
      supabase.from("sales_leads").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(600),
      supabase
        .from("employees")
        .select("id,first_name,last_name,role")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("first_name", { ascending: true }),
    ]);

    if (leadError || empError) {
      setError(leadError?.message ?? empError?.message ?? "Failed to load sales leads.");
      setLoading(false);
      return;
    }

    const loadedLeads = (leadRows ?? []) as SalesLeadRow[];
    const loadedEmployees = (employeeRows ?? []) as EmployeeRow[];

    setLeads(loadedLeads);
    setEmployees(loadedEmployees);

    if (loadedLeads.length > 0) {
      const leadIds = loadedLeads.map((lead) => lead.id);
      const { data: historyRows, error: historyError } = await supabase
        .from("sales_lead_status_history")
        .select("id,lead_id,from_status,to_status,changed_at")
        .in("lead_id", leadIds)
        .order("changed_at", { ascending: false });

      if (historyError) {
        setError(historyError.message);
      } else {
        const grouped = (historyRows ?? []).reduce<Record<string, StatusHistoryRow[]>>((acc, row) => {
          const typed = row as StatusHistoryRow;
          if (!acc[typed.lead_id]) {
            acc[typed.lead_id] = [];
          }
          acc[typed.lead_id].push(typed);
          return acc;
        }, {});
        setHistoryByLead(grouped);
      }
    } else {
      setHistoryByLead({});
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const employeeLabelById = useMemo(
    () =>
      employees.reduce<Record<string, string>>((acc, employee) => {
        acc[employee.id] = `${employee.first_name} ${employee.last_name}`;
        return acc;
      }, {}),
    [employees],
  );

  const filteredLeads = useMemo(() => {
    const nowIso = new Date().toISOString();
    return leads.filter((lead) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const haystack = [lead.company_name, lead.contact_name, lead.email, lead.phone].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (statusFilter && lead.status !== statusFilter) return false;
      if (sourceFilter && lead.source !== sourceFilter) return false;
      if (foundingFilter === "yes" && !lead.founding_partner_interest) return false;
      if (foundingFilter === "no" && lead.founding_partner_interest) return false;
      if (assignedFilter && (lead.assigned_to ?? "") !== assignedFilter) return false;
      if (followUpFilter === "due") {
        if (!lead.next_follow_up_at || lead.next_follow_up_at > nowIso) return false;
      }

      return true;
    });
  }, [assignedFilter, followUpFilter, foundingFilter, leads, search, sourceFilter, statusFilter]);

  const selectedLead = useMemo(
    () => filteredLeads.find((lead) => lead.id === selectedLeadId) ?? leads.find((lead) => lead.id === selectedLeadId) ?? null,
    [filteredLeads, leads, selectedLeadId],
  );

  useEffect(() => {
    if (!selectedLead) return;
    setDraftStatus(selectedLead.status);
    setDraftAssignedTo(selectedLead.assigned_to ?? "");
    setDraftFollowUp(toDatetimeLocalValue(selectedLead.next_follow_up_at));
    setDraftDemoAt(toDatetimeLocalValue(selectedLead.demo_scheduled_at));
    setDraftProposalAmount(selectedLead.proposal_amount?.toString() ?? "");
    setDraftLostReason(selectedLead.lost_reason ?? "");
    setDraftNotes(selectedLead.internal_notes ?? "");
  }, [selectedLead]);

  const leadsByStatus = useMemo(() => {
    return STATUSES.reduce<Record<SalesLeadStatus, SalesLeadRow[]>>((acc, status) => {
      acc[status] = filteredLeads.filter((lead) => lead.status === status);
      return acc;
    }, {
      new: [],
      contacted: [],
      demo_scheduled: [],
      proposal_sent: [],
      won: [],
      lost: [],
    });
  }, [filteredLeads]);

  const newLeadCount = useMemo(() => leads.filter((lead) => lead.status === "new").length, [leads]);

  const saveLeadUpdates = async () => {
    if (!selectedLead) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const payload = {
      status: draftStatus,
      assigned_to: draftAssignedTo || null,
      next_follow_up_at: fromDatetimeLocalValue(draftFollowUp),
      demo_scheduled_at: fromDatetimeLocalValue(draftDemoAt),
      proposal_amount: draftProposalAmount ? Number(draftProposalAmount) : null,
      lost_reason: draftLostReason.trim() || null,
      internal_notes: draftNotes.trim() || null,
    };

    const { error: updateError } = await supabase.from("sales_leads").update(payload).eq("id", selectedLead.id);

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    setSuccess("Lead updated.");
    await loadData();
    setSubmitting(false);
  };

  const handleMarkLost = async () => {
    if (!selectedLead) return;
    const reason = window.prompt("Enter a lost reason:", draftLostReason || "");
    if (reason === null) return;

    setDraftStatus("lost");
    setDraftLostReason(reason.trim());
  };

  const handleMarkWon = async () => {
    if (!selectedLead || !context?.isTenantAdmin || !context.tenantId) return;

    const confirmed = window.confirm(
      "Mark this lead as Won and convert to a customer if needed? This preserves the lead and links the customer.",
    );

    if (!confirmed) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      let customerId = selectedLead.converted_customer_id;

      if (!customerId) {
        let existingCustomerId: string | null = null;

        const { data: customerByEmail, error: customerByEmailError } = await supabase
          .from("customers")
          .select("id")
          .eq("tenant_id", context.tenantId)
          .eq("email", selectedLead.email)
          .limit(1)
          .maybeSingle();

        if (customerByEmailError) throw new Error(customerByEmailError.message);
        existingCustomerId = customerByEmail?.id ?? null;

        if (!existingCustomerId && selectedLead.company_name) {
          const { data: customerByCompany, error: customerByCompanyError } = await supabase
            .from("customers")
            .select("id")
            .eq("tenant_id", context.tenantId)
            .ilike("company_name", selectedLead.company_name)
            .limit(1)
            .maybeSingle();

          if (customerByCompanyError) throw new Error(customerByCompanyError.message);
          existingCustomerId = customerByCompany?.id ?? null;
        }

        if (existingCustomerId) {
          customerId = existingCustomerId;
        } else {
          const { data: insertedCustomer, error: insertCustomerError } = await supabase
            .from("customers")
            .insert({
              tenant_id: context.tenantId,
              company_name: selectedLead.company_name || selectedLead.contact_name,
              contact_name: selectedLead.contact_name,
              email: selectedLead.email,
              phone: selectedLead.phone,
              notes: `Converted from sales lead ${selectedLead.id}`,
            })
            .select("id")
            .single();

          if (insertCustomerError) throw new Error(insertCustomerError.message);
          customerId = insertedCustomer.id;
        }
      }

      const { error: leadUpdateError } = await supabase
        .from("sales_leads")
        .update({
          status: "won",
          converted_customer_id: customerId,
          lost_reason: null,
        })
        .eq("id", selectedLead.id);

      if (leadUpdateError) throw new Error(leadUpdateError.message);

      trackAnalyticsEvent("lead_marked_won", { source: selectedLead.source });

      setSuccess("Lead marked as Won and customer linked.");
      await loadData();
    } catch (conversionError) {
      setError(conversionError instanceof Error ? conversionError.message : "Failed to convert lead.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-slate-200 bg-white/90 px-5 py-6 lg:w-64 lg:border-b-0 lg:border-r">
          <ServiceOSLogo variant="horizontal" size="compact-sidebar" />
          <nav className="mt-8 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  item.active ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>{item.label === "Leads" ? "Sales Pipeline" : item.label === "Dashboard" ? t("common.dashboard") : item.label}</span>
                {item.label === "Leads" && newLeadCount > 0 ? (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.active ? "bg-white text-blue-700" : "bg-blue-600 text-white"}`}>
                    {newLeadCount}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <header className="mb-6 rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
            <p className="text-sm font-medium text-blue-600">Admin Portal</p>
            <h1 className="text-2xl font-semibold text-slate-900">Sales Pipeline</h1>
            <p className="mt-1 text-sm text-slate-500">
              Track, qualify, and convert inbound leads without auto-creating customers.
            </p>
            {context ? <p className="mt-2 text-xs text-slate-500">Signed in as: {context.roleLabel}</p> : null}
          </header>

          {error ? <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
          {success ? <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search company, contact, email, phone"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
              />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                <option value="">All statuses</option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                <option value="">All sources</option>
                {SOURCES.map((source) => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
              <select value={foundingFilter} onChange={(event) => setFoundingFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                <option value="">Founding Partner: Any</option>
                <option value="yes">Founding Partner: Yes</option>
                <option value="no">Founding Partner: No</option>
              </select>
              <select value={assignedFilter} onChange={(event) => setAssignedFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                <option value="">All owners</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.first_name} {employee.last_name}</option>
                ))}
              </select>
              <select value={followUpFilter} onChange={(event) => setFollowUpFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                <option value="">Follow-up: Any</option>
                <option value="due">Follow-up due</option>
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode("kanban")}
                  className={`rounded-xl px-3 py-2 text-sm font-medium ${viewMode === "kanban" ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-700"}`}
                >
                  Kanban
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`rounded-xl px-3 py-2 text-sm font-medium ${viewMode === "table" ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-700"}`}
                >
                  Table
                </button>
              </div>
            </div>
          </section>

          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Loading sales leads...</p>
          ) : viewMode === "kanban" ? (
            <section className="mt-5 grid gap-4 xl:grid-cols-3">
              {STATUSES.map((status) => (
                <article key={status} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{status.replace("_", " ")}</h2>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{leadsByStatus[status].length}</span>
                  </div>
                  <div className="space-y-2">
                    {leadsByStatus[status].length === 0 ? (
                      <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">No leads</p>
                    ) : (
                      leadsByStatus[status].map((lead) => (
                        <button
                          key={lead.id}
                          type="button"
                          onClick={() => setSelectedLeadId(lead.id)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
                        >
                          <p className="text-sm font-semibold text-slate-900">{lead.company_name || lead.contact_name}</p>
                          <p className="text-xs text-slate-600">{lead.contact_name}</p>
                          <p className="mt-1 text-xs text-slate-500">{lead.source}</p>
                        </button>
                      ))
                    )}
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Contact</th>
                      <th className="px-4 py-3 text-left font-medium">Company</th>
                      <th className="px-4 py-3 text-left font-medium">Email</th>
                      <th className="px-4 py-3 text-left font-medium">Source</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Owner</th>
                      <th className="px-4 py-3 text-left font-medium">Follow-up</th>
                      <th className="px-4 py-3 text-left font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50" onClick={() => setSelectedLeadId(lead.id)}>
                        <td className="px-4 py-3 font-medium text-slate-900">{lead.contact_name}</td>
                        <td className="px-4 py-3 text-slate-700">{lead.company_name || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{lead.email}</td>
                        <td className="px-4 py-3 text-slate-700">{lead.source}</td>
                        <td className="px-4 py-3 text-slate-700">{lead.status}</td>
                        <td className="px-4 py-3 text-slate-700">{employeeLabelById[lead.assigned_to || ""] || "Unassigned"}</td>
                        <td className="px-4 py-3 text-slate-700">{formatDateTime(lead.next_follow_up_at)}</td>
                        <td className="px-4 py-3 text-slate-700">{formatDateTime(lead.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {selectedLead ? (
            <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{selectedLead.company_name || selectedLead.contact_name}</h2>
                  <p className="text-sm text-slate-500">Lead ID: {selectedLead.id}</p>
                </div>
                <button type="button" onClick={() => setSelectedLeadId(null)} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">Close</button>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <p><span className="font-medium text-slate-700">Contact:</span> {selectedLead.contact_name}</p>
                  <p><span className="font-medium text-slate-700">Email:</span> {selectedLead.email}</p>
                  <p><span className="font-medium text-slate-700">Phone:</span> {selectedLead.phone || "-"}</p>
                  <p><span className="font-medium text-slate-700">Company:</span> {selectedLead.company_name || "-"}</p>
                  <p><span className="font-medium text-slate-700">Business Type:</span> {selectedLead.business_type || "-"}</p>
                  <p><span className="font-medium text-slate-700">Employee Count:</span> {selectedLead.employee_count || "-"}</p>
                  <p><span className="font-medium text-slate-700">Source:</span> {selectedLead.source}</p>
                  <p><span className="font-medium text-slate-700">Founding Partner:</span> {selectedLead.founding_partner_interest ? "Yes" : "No"}</p>
                  <p><span className="font-medium text-slate-700">Created:</span> {formatDateTime(selectedLead.created_at)}</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                    <select value={draftStatus} onChange={(event) => setDraftStatus(event.target.value as SalesLeadStatus)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Assigned owner</label>
                    <select value={draftAssignedTo} onChange={(event) => setDraftAssignedTo(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                      <option value="">Unassigned</option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>{employee.first_name} {employee.last_name} ({employee.role})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Next follow-up</label>
                    <input type="datetime-local" value={draftFollowUp} onChange={(event) => setDraftFollowUp(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Demo date</label>
                    <input type="datetime-local" value={draftDemoAt} onChange={(event) => setDraftDemoAt(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Proposal amount</label>
                    <input type="number" step="0.01" value={draftProposalAmount} onChange={(event) => setDraftProposalAmount(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" placeholder="0.00" />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Lost reason</label>
                    <input value={draftLostReason} onChange={(event) => setDraftLostReason(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Internal notes</label>
                    <textarea value={draftNotes} onChange={(event) => setDraftNotes(event.target.value)} rows={4} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={saveLeadUpdates} disabled={submitting} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400">Save changes</button>
                    <button type="button" onClick={handleMarkLost} disabled={submitting} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100">Mark Lost</button>
                    <button type="button" onClick={handleMarkWon} disabled={submitting || !context?.isTenantAdmin} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60">Mark Won</button>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Original message</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{selectedLead.message || "No message provided."}</p>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Status history</p>
                <div className="mt-2 space-y-2">
                  {(historyByLead[selectedLead.id] ?? []).length === 0 ? (
                    <p className="text-sm text-slate-500">No status transitions recorded yet.</p>
                  ) : (
                    (historyByLead[selectedLead.id] ?? []).map((entry) => (
                      <p key={entry.id} className="text-sm text-slate-700">
                        {entry.from_status || "new"} → {entry.to_status} at {formatDateTime(entry.changed_at)}
                      </p>
                    ))
                  )}
                </div>
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
