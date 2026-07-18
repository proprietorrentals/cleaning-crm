import { createServerSupabaseClient } from "@/lib/supabase/server";

type MarketplaceLead = {
  lead_id: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  property_type: string;
  square_footage: number;
  cleaning_frequency: string;
  service_requested: string;
  budget: string | null;
  preferred_start_date: string;
  notes: string | null;
  photo_urls: string[];
  ai_score: number;
  estimated_contract_value: number;
  close_probability: number;
  status: string;
  created_at: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SuperAdminLeadMarketplacePage() {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("marketplace_leads")
    .select(
      "lead_id,business_name,contact_name,email,phone,address,city,state,zip_code,property_type,square_footage,cleaning_frequency,service_requested,budget,preferred_start_date,notes,photo_urls,ai_score,estimated_contract_value,close_probability,status,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  const leads = ((data ?? []) as MarketplaceLead[]).map((lead) => ({
    ...lead,
    photo_urls: Array.isArray(lead.photo_urls) ? lead.photo_urls : [],
  }));

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Lead Marketplace
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Public commercial cleaning quote requests submitted through
              /request-quote.
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Total leads
            </p>
            <p className="text-xl font-semibold text-cyan-300">
              {leads.length}
            </p>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-rose-900/60 bg-rose-950/50 px-5 py-4 text-sm text-rose-200">
            Unable to load marketplace leads: {error.message}
          </div>
        ) : leads.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-8 text-center text-sm text-slate-400">
            No quote requests have been submitted yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80 shadow-lg">
            <table className="min-w-[1200px] w-full divide-y divide-slate-800 text-left text-sm">
              <thead className="bg-slate-900">
                <tr className="text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Scope</th>
                  <th className="px-4 py-3">AI Snapshot</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {leads.map((lead) => (
                  <tr key={lead.lead_id} className="align-top">
                    <td className="px-4 py-4 text-slate-300">
                      {formatDate(lead.created_at)}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-white">
                        {lead.business_name}
                      </p>
                      <p className="text-slate-300">{lead.contact_name}</p>
                      {lead.notes ? (
                        <p className="mt-2 line-clamp-3 max-w-xs text-xs text-slate-400">
                          {lead.notes}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-slate-300">
                      <p>{lead.address}</p>
                      <p>
                        {lead.city}, {lead.state} {lead.zip_code}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-slate-300">
                      <p>{lead.property_type}</p>
                      <p>{lead.square_footage.toLocaleString()} sq ft</p>
                      <p>{lead.cleaning_frequency}</p>
                      <p>{lead.service_requested}</p>
                      {lead.budget ? (
                        <p className="text-xs text-slate-400">
                          Budget: {lead.budget}
                        </p>
                      ) : null}
                      <p className="text-xs text-slate-400">
                        Start: {lead.preferred_start_date}
                      </p>
                      {lead.photo_urls.length > 0 ? (
                        <p className="mt-2 text-xs text-cyan-300">
                          {lead.photo_urls.length} photo(s) uploaded
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-slate-300">
                      <p>Score: {lead.ai_score}</p>
                      <p>
                        Est. value:{" "}
                        {formatCurrency(lead.estimated_contract_value)}
                      </p>
                      <p>
                        Close probability:{" "}
                        {(lead.close_probability * 100).toFixed(0)}%
                      </p>
                    </td>
                    <td className="px-4 py-4 text-slate-300">
                      <p>{lead.email}</p>
                      <p>{lead.phone}</p>
                      {lead.photo_urls.length > 0 ? (
                        <div className="mt-2 space-y-1">
                          {lead.photo_urls.slice(0, 3).map((url, index) => (
                            <a
                              key={`${lead.lead_id}-photo-${index}`}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-xs text-cyan-300 hover:text-cyan-200"
                            >
                              View photo {index + 1}
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-full border border-cyan-500/50 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-200">
                        {lead.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
