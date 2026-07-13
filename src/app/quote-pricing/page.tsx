"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AdminGuard } from "@/components/admin-guard";
import { ServiceOSBrand } from "@/components/serviceos-brand";

type PricingSettings = {
  tenant_id: string;
  base_service_fee: string;
  price_per_square_foot: string;
  restroom_pricing_mode: "per_restroom" | "per_fixture";
  restroom_unit_price: string;
  kitchen_breakroom_price: string;
  floor_care_price: string;
  carpet_cleaning_price: string;
  window_cleaning_price: string;
  frequency_multiplier_one_time: string;
  frequency_multiplier_daily: string;
  frequency_multiplier_weekly: string;
  frequency_multiplier_biweekly: string;
  frequency_multiplier_monthly: string;
  minimum_job_price: string;
  travel_service_fee: string;
  tax_rate_percent: string;
};

type PricingItem = {
  id: string;
  name: string;
  pricing_type: "flat" | "quantity" | "square_foot" | "percentage";
  unit_price: number;
  customer_description: string | null;
  is_active: boolean;
  sort_order: number;
};

type NewPricingItemState = {
  name: string;
  pricing_type: "flat" | "quantity" | "square_foot" | "percentage";
  unit_price: string;
  customer_description: string;
};

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Customers", href: "/customers" },
  { label: "Quotes", href: "/quotes" },
  { label: "Quote Pricing", href: "/quote-pricing", active: true },
  { label: "Jobs", href: "/jobs" },
  { label: "Employees", href: "/employees" },
  { label: "Invoices", href: "/invoices" },
  { label: "Schedule", href: "/schedule" },
  { label: "Reports", href: "/reports" },
  { label: "Settings", href: "/settings" },
];

const emptyItem: NewPricingItemState = {
  name: "",
  pricing_type: "flat" as const,
  unit_price: "",
  customer_description: "",
};

function toNumberOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function QuotePricingContent() {
  const supabase = useMemo(() => createClient(), []);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [settings, setSettings] = useState<PricingSettings | null>(null);
  const [items, setItems] = useState<PricingItem[]>([]);
  const [newItem, setNewItem] = useState<NewPricingItemState>(emptyItem);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setMessage(null);

      const { data: tenantData, error: tenantError } = await supabase.rpc("current_tenant_id");
      if (tenantError) {
        setMessage({ type: "error", text: tenantError.message });
        setLoading(false);
        return;
      }

      if (!tenantData) {
        setMessage({ type: "error", text: "Unable to resolve tenant for quote pricing settings." });
        setLoading(false);
        return;
      }

      setTenantId(tenantData);

      let { data: settingsRow, error: settingsError } = await supabase
        .from("quote_pricing_settings")
        .select("*")
        .eq("tenant_id", tenantData)
        .maybeSingle();

      if (settingsError) {
        setMessage({ type: "error", text: settingsError.message });
        setLoading(false);
        return;
      }

      if (!settingsRow) {
        const { data: insertedSettings, error: insertSettingsError } = await supabase
          .from("quote_pricing_settings")
          .insert({ tenant_id: tenantData })
          .select("*")
          .single();

        if (insertSettingsError) {
          setMessage({ type: "error", text: insertSettingsError.message });
          setLoading(false);
          return;
        }

        settingsRow = insertedSettings;
      }

      const { data: itemRows, error: itemError } = await supabase
        .from("quote_pricing_items")
        .select("id,name,pricing_type,unit_price,customer_description,is_active,sort_order")
        .eq("tenant_id", tenantData)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (itemError) {
        setMessage({ type: "error", text: itemError.message });
        setLoading(false);
        return;
      }

      setSettings({
        tenant_id: settingsRow.tenant_id,
        base_service_fee: String(settingsRow.base_service_fee ?? 0),
        price_per_square_foot: String(settingsRow.price_per_square_foot ?? 0),
        restroom_pricing_mode: settingsRow.restroom_pricing_mode ?? "per_restroom",
        restroom_unit_price: String(settingsRow.restroom_unit_price ?? 0),
        kitchen_breakroom_price: String(settingsRow.kitchen_breakroom_price ?? 0),
        floor_care_price: String(settingsRow.floor_care_price ?? 0),
        carpet_cleaning_price: String(settingsRow.carpet_cleaning_price ?? 0),
        window_cleaning_price: String(settingsRow.window_cleaning_price ?? 0),
        frequency_multiplier_one_time: String(settingsRow.frequency_multiplier_one_time ?? 1),
        frequency_multiplier_daily: String(settingsRow.frequency_multiplier_daily ?? 1),
        frequency_multiplier_weekly: String(settingsRow.frequency_multiplier_weekly ?? 1),
        frequency_multiplier_biweekly: String(settingsRow.frequency_multiplier_biweekly ?? 1),
        frequency_multiplier_monthly: String(settingsRow.frequency_multiplier_monthly ?? 1),
        minimum_job_price: settingsRow.minimum_job_price == null ? "" : String(settingsRow.minimum_job_price),
        travel_service_fee: settingsRow.travel_service_fee == null ? "" : String(settingsRow.travel_service_fee),
        tax_rate_percent: String(settingsRow.tax_rate_percent ?? 0),
      });

      setItems((itemRows ?? []) as PricingItem[]);
      setLoading(false);
    };

    load();
  }, [supabase]);

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!settings || !tenantId) return;

    setSaving(true);
    setMessage(null);

    const payload = {
      tenant_id: tenantId,
      base_service_fee: Number(settings.base_service_fee) || 0,
      price_per_square_foot: Number(settings.price_per_square_foot) || 0,
      restroom_pricing_mode: settings.restroom_pricing_mode,
      restroom_unit_price: Number(settings.restroom_unit_price) || 0,
      kitchen_breakroom_price: Number(settings.kitchen_breakroom_price) || 0,
      floor_care_price: Number(settings.floor_care_price) || 0,
      carpet_cleaning_price: Number(settings.carpet_cleaning_price) || 0,
      window_cleaning_price: Number(settings.window_cleaning_price) || 0,
      frequency_multiplier_one_time: Number(settings.frequency_multiplier_one_time) || 1,
      frequency_multiplier_daily: Number(settings.frequency_multiplier_daily) || 1,
      frequency_multiplier_weekly: Number(settings.frequency_multiplier_weekly) || 1,
      frequency_multiplier_biweekly: Number(settings.frequency_multiplier_biweekly) || 1,
      frequency_multiplier_monthly: Number(settings.frequency_multiplier_monthly) || 1,
      minimum_job_price: toNumberOrNull(settings.minimum_job_price),
      travel_service_fee: toNumberOrNull(settings.travel_service_fee),
      tax_rate_percent: Number(settings.tax_rate_percent) || 0,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("quote_pricing_settings").upsert(payload, { onConflict: "tenant_id" });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Quote pricing settings saved." });
    }

    setSaving(false);
  };

  const addItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!tenantId) return;

    setMessage(null);

    if (!newItem.name.trim()) {
      setMessage({ type: "error", text: "Custom extra service name is required." });
      return;
    }

    const unitPrice = Number(newItem.unit_price);
    if (!Number.isFinite(unitPrice)) {
      setMessage({ type: "error", text: "Enter a valid unit price." });
      return;
    }

    const sortOrder = items.length === 0 ? 0 : Math.max(...items.map((item) => item.sort_order)) + 1;

    const { data, error } = await supabase
      .from("quote_pricing_items")
      .insert({
        tenant_id: tenantId,
        name: newItem.name.trim(),
        pricing_type: newItem.pricing_type,
        unit_price: unitPrice,
        customer_description: newItem.customer_description.trim() || null,
        is_active: true,
        sort_order: sortOrder,
      })
      .select("id,name,pricing_type,unit_price,customer_description,is_active,sort_order")
      .single();

    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }

    setItems((current) => [...current, data as PricingItem]);
    setNewItem(emptyItem);
    setMessage({ type: "success", text: "Custom extra service added." });
  };

  const updateItem = async (item: PricingItem, patch: Partial<PricingItem>) => {
    const next = { ...item, ...patch };
    const { error } = await supabase
      .from("quote_pricing_items")
      .update({
        name: next.name,
        pricing_type: next.pricing_type,
        unit_price: next.unit_price,
        customer_description: next.customer_description,
        is_active: next.is_active,
        sort_order: next.sort_order,
      })
      .eq("id", item.id);

    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }

    setItems((current) => current.map((entry) => (entry.id === item.id ? next : entry)));
  };

  if (loading || !settings) {
    return <p className="p-6 text-sm text-slate-500">Loading quote pricing settings...</p>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-slate-200 bg-white/90 px-5 py-6 lg:w-64 lg:border-b-0 lg:border-r">
          <ServiceOSBrand subtitle="Operations Hub" />
          <nav className="mt-8 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  item.active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <header className="mb-6 rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
            <p className="text-sm font-medium text-blue-600">Quotes</p>
            <h1 className="text-2xl font-semibold text-slate-900">Quote Pricing Configuration</h1>
            <p className="mt-1 text-sm text-slate-500">Configure tenant-specific quote math and custom services.</p>
          </header>

          {message ? (
            <div
              className={`mb-4 rounded-xl px-4 py-3 text-sm ${
                message.type === "success"
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {message.text}
            </div>
          ) : null}

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-slate-900">Core Pricing</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[ 
                  ["Base service fee", "base_service_fee"],
                  ["Price per square foot", "price_per_square_foot"],
                  ["Restroom unit price", "restroom_unit_price"],
                  ["Kitchen/breakroom price", "kitchen_breakroom_price"],
                  ["Floor care price", "floor_care_price"],
                  ["Carpet cleaning price", "carpet_cleaning_price"],
                  ["Window cleaning price", "window_cleaning_price"],
                  ["Minimum job price", "minimum_job_price"],
                  ["Travel/service fee", "travel_service_fee"],
                  ["Tax rate %", "tax_rate_percent"],
                ].map(([label, field]) => (
                  <div key={field}>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={settings[field as keyof PricingSettings] as string}
                      onChange={(event) =>
                        setSettings((current) =>
                          current
                            ? { ...current, [field]: event.target.value }
                            : current,
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Restroom pricing mode</label>
                  <select
                    value={settings.restroom_pricing_mode}
                    onChange={(event) =>
                      setSettings((current) =>
                        current
                          ? {
                              ...current,
                              restroom_pricing_mode: event.target.value as "per_restroom" | "per_fixture",
                            }
                          : current,
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="per_restroom">Per restroom</option>
                    <option value="per_fixture">Per fixture</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-slate-900">Frequency Multipliers</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  ["One-time", "frequency_multiplier_one_time"],
                  ["Daily", "frequency_multiplier_daily"],
                  ["Weekly", "frequency_multiplier_weekly"],
                  ["Biweekly", "frequency_multiplier_biweekly"],
                  ["Monthly", "frequency_multiplier_monthly"],
                ].map(([label, field]) => (
                  <div key={field}>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={settings[field as keyof PricingSettings] as string}
                      onChange={(event) =>
                        setSettings((current) =>
                          current
                            ? { ...current, [field]: event.target.value }
                            : current,
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-slate-900">Custom Extra Services</h2>

              <div className="grid gap-3 border-b border-slate-200 pb-4 lg:grid-cols-[1.1fr_0.8fr_0.7fr_1.1fr_auto]">
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(event) => setNewItem((current) => ({ ...current, name: event.target.value }))}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
                  placeholder="Service name"
                />
                <select
                  value={newItem.pricing_type}
                  onChange={(event) =>
                    setNewItem((current) => ({
                      ...current,
                      pricing_type: event.target.value as "flat" | "quantity" | "square_foot" | "percentage",
                    }))
                  }
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
                >
                  <option value="flat">Flat</option>
                  <option value="quantity">Quantity</option>
                  <option value="square_foot">Square foot</option>
                  <option value="percentage">Percentage</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={newItem.unit_price}
                  onChange={(event) => setNewItem((current) => ({ ...current, unit_price: event.target.value }))}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
                  placeholder="Unit price"
                />
                <input
                  type="text"
                  value={newItem.customer_description}
                  onChange={(event) => setNewItem((current) => ({ ...current, customer_description: event.target.value }))}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
                  placeholder="Customer description"
                />
                <button
                  type="button"
                  onClick={(event) => {
                    void addItem(event as unknown as React.FormEvent);
                  }}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Add
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {items.length === 0 ? (
                  <p className="text-sm text-slate-500">No custom extra services configured yet.</p>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="grid gap-3 rounded-2xl border border-slate-200 p-3 lg:grid-cols-[1.1fr_0.8fr_0.7fr_1.1fr_0.6fr]">
                      <input
                        value={item.name}
                        onChange={(event) =>
                          setItems((current) =>
                            current.map((entry) =>
                              entry.id === item.id ? { ...entry, name: event.target.value } : entry,
                            ),
                          )
                        }
                        onBlur={() => updateItem(item, {})}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
                      />
                      <select
                        value={item.pricing_type}
                        onChange={(event) => updateItem(item, { pricing_type: event.target.value as PricingItem["pricing_type"] })}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
                      >
                        <option value="flat">Flat</option>
                        <option value="quantity">Quantity</option>
                        <option value="square_foot">Square foot</option>
                        <option value="percentage">Percentage</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(event) =>
                          setItems((current) =>
                            current.map((entry) =>
                              entry.id === item.id ? { ...entry, unit_price: Number(event.target.value || 0) } : entry,
                            ),
                          )
                        }
                        onBlur={() => updateItem(item, {})}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
                      />
                      <input
                        value={item.customer_description ?? ""}
                        onChange={(event) =>
                          setItems((current) =>
                            current.map((entry) =>
                              entry.id === item.id ? { ...entry, customer_description: event.target.value } : entry,
                            ),
                          )
                        }
                        onBlur={() => updateItem(item, {})}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
                      />
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={item.is_active}
                          onChange={(event) => updateItem(item, { is_active: event.target.checked })}
                        />
                        Active
                      </label>
                    </div>
                  ))
                )}
              </div>
            </section>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={(event) => {
                  void saveSettings(event as unknown as React.FormEvent);
                }}
                disabled={saving}
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Pricing Configuration"}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function QuotePricingPage() {
  return (
    <AdminGuard>
      <QuotePricingContent />
    </AdminGuard>
  );
}
