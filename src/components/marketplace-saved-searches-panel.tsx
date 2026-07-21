"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type SavedSearchRow = {
  saved_search_id: string;
  name: string;
  state: string | null;
  city: string | null;
  radius_miles: number;
  property_type: string | null;
  lead_grade: string | null;
  minimum_contract_value: number;
  verified_only: boolean;
  notification_email: boolean;
  notification_in_app: boolean;
  notification_sms: boolean;
  created_by_user_email: string | null;
  last_matched_at: string | null;
  created_at: string;
};

type FormState = {
  name: string;
  state: string;
  city: string;
  radiusMiles: string;
  propertyType: string;
  leadGrade: string;
  minimumContractValue: string;
  verifiedOnly: boolean;
  notificationEmail: boolean;
  notificationInApp: boolean;
  notificationSms: boolean;
};

const INITIAL_FORM: FormState = {
  name: "",
  state: "",
  city: "",
  radiusMiles: "25",
  propertyType: "",
  leadGrade: "",
  minimumContractValue: "",
  verifiedOnly: true,
  notificationEmail: true,
  notificationInApp: true,
  notificationSms: false,
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

function methodLabels(search: SavedSearchRow) {
  return [
    search.notification_email ? "Email" : null,
    search.notification_in_app ? "In-app" : null,
    search.notification_sms ? "SMS (placeholder)" : null,
  ].filter(Boolean) as string[];
}

function buildSummary(search: SavedSearchRow) {
  const parts = [];

  if (search.verified_only) parts.push("Verified only");
  if (search.state) parts.push(`State ${search.state}`);
  if (search.city) parts.push(`City ${search.city}`);
  if (search.radius_miles > 0 && search.city)
    parts.push(`${search.radius_miles} mi radius`);
  if (search.property_type) parts.push(search.property_type);
  if (search.lead_grade) parts.push(`Grade ${search.lead_grade}`);
  if (search.minimum_contract_value > 0)
    parts.push(`Min ${formatCurrency(search.minimum_contract_value)}`);

  return parts.length > 0 ? parts.join(" • ") : "Broad matching criteria";
}

export function MarketplaceSavedSearchesPanel() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savedSearches, setSavedSearches] = useState<SavedSearchRow[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const loadSavedSearches = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from("marketplace_saved_searches")
      .select(
        "saved_search_id,name,state,city,radius_miles,property_type,lead_grade,minimum_contract_value,verified_only,notification_email,notification_in_app,notification_sms,created_by_user_email,last_matched_at,created_at",
      )
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }

    setSavedSearches((data ?? []) as SavedSearchRow[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadSavedSearches();
  }, [loadSavedSearches]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const radiusMiles = Number(form.radiusMiles);
    const minimumContractValue = Number(form.minimumContractValue);

    const { error: insertError } = await supabase
      .from("marketplace_saved_searches")
      .insert({
        name: form.name.trim(),
        state: form.state.trim() || null,
        city: form.city.trim() || null,
        radius_miles: Number.isFinite(radiusMiles) ? radiusMiles : 25,
        property_type: form.propertyType.trim() || null,
        lead_grade: form.leadGrade.trim() || null,
        minimum_contract_value: Number.isFinite(minimumContractValue)
          ? minimumContractValue
          : 0,
        verified_only: form.verifiedOnly,
        notification_email: form.notificationEmail,
        notification_in_app: form.notificationInApp,
        notification_sms: form.notificationSms,
        created_by_user_id: user?.id ?? null,
        created_by_user_email: user?.email ?? null,
      });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setForm(INITIAL_FORM);
    setSuccess("Saved search created.");
    await loadSavedSearches();
    setSaving(false);
  };

  const deleteSavedSearch = async (savedSearchId: string) => {
    const confirmed = window.confirm("Delete this saved search?");
    if (!confirmed) return;

    setDeletingId(savedSearchId);
    setError(null);
    setSuccess(null);

    const { error: deleteError } = await supabase
      .from("marketplace_saved_searches")
      .delete()
      .eq("saved_search_id", savedSearchId);

    if (deleteError) {
      setError(deleteError.message);
      setDeletingId(null);
      return;
    }

    setSuccess("Saved search deleted.");
    await loadSavedSearches();
    setDeletingId(null);
  };

  return (
    <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700/80">
              New alert
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              Save a smart lead search
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Companies can save multiple searches, then receive in-app alerts
              when verified leads match.
            </p>
          </div>
          <div className="rounded-2xl bg-cyan-50 px-4 py-3 text-right">
            <p className="text-xs text-cyan-700">Current searches</p>
            <p className="text-2xl font-semibold text-cyan-950">
              {savedSearches.length}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Name
              </span>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
                placeholder="Office cleanings in Austin"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Radius miles
              </span>
              <input
                type="number"
                min="0"
                max="500"
                value={form.radiusMiles}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    radiusMiles: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:bg-white"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                State
              </span>
              <input
                value={form.state}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    state: event.target.value,
                  }))
                }
                placeholder="TX"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                City
              </span>
              <input
                value={form.city}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    city: event.target.value,
                  }))
                }
                placeholder="Austin"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Property type
              </span>
              <input
                value={form.propertyType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    propertyType: event.target.value,
                  }))
                }
                placeholder="Office"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                AI grade
              </span>
              <select
                value={form.leadGrade}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    leadGrade: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:bg-white"
              >
                <option value="">Any grade</option>
                <option value="A+">A+</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="F">F</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Minimum contract value
              </span>
              <input
                type="number"
                min="0"
                step="100"
                value={form.minimumContractValue}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    minimumContractValue: event.target.value,
                  }))
                }
                placeholder="5000"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:bg-white"
              />
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.verifiedOnly}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    verifiedOnly: event.target.checked,
                  }))
                }
              />
              Verified only
            </label>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              Notification methods
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.notificationEmail}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notificationEmail: event.target.checked,
                    }))
                  }
                />
                Email
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.notificationInApp}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notificationInApp: event.target.checked,
                    }))
                  }
                />
                In-app
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.notificationSms}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notificationSms: event.target.checked,
                    }))
                  }
                />
                SMS placeholder
              </label>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex rounded-full bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save search"}
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700/80">
                Saved searches
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                Active alert definitions
              </h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {savedSearches.length} total
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Loading saved searches...
              </div>
            ) : savedSearches.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                No saved searches yet. Create one to start receiving smart
                alerts.
              </div>
            ) : (
              savedSearches.map((search) => (
                <article
                  key={search.saved_search_id}
                  className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {search.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {buildSummary(search)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        void deleteSavedSearch(search.saved_search_id)
                      }
                      disabled={deletingId === search.saved_search_id}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:text-rose-700 disabled:opacity-60"
                    >
                      {deletingId === search.saved_search_id
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                    {search.state ? (
                      <span className="rounded-full bg-white px-3 py-1">
                        {search.state}
                      </span>
                    ) : null}
                    {search.city ? (
                      <span className="rounded-full bg-white px-3 py-1">
                        {search.city}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-white px-3 py-1">
                      {search.radius_miles} mi
                    </span>
                    {search.property_type ? (
                      <span className="rounded-full bg-white px-3 py-1">
                        {search.property_type}
                      </span>
                    ) : null}
                    {search.lead_grade ? (
                      <span className="rounded-full bg-white px-3 py-1">
                        Grade {search.lead_grade}
                      </span>
                    ) : null}
                    {search.minimum_contract_value > 0 ? (
                      <span className="rounded-full bg-white px-3 py-1">
                        Min {formatCurrency(search.minimum_contract_value)}
                      </span>
                    ) : null}
                    {search.verified_only ? (
                      <span className="rounded-full bg-cyan-100 px-3 py-1 text-cyan-800">
                        Verified only
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {methodLabels(search).map((label) => (
                      <span
                        key={label}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700"
                      >
                        {label}
                      </span>
                    ))}
                    {search.created_by_user_email ? (
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700">
                        {search.created_by_user_email}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <p>Created {formatDate(search.created_at)}</p>
                    <p>
                      {search.last_matched_at
                        ? `Last matched ${formatDate(search.last_matched_at)}`
                        : "Waiting for a verified match"}
                    </p>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
