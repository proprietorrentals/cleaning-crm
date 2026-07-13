"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type Customer = {
  id: string;
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  building_size: string;
  cleaning_frequency: string;
  notes: string;
  created_at: string;
};

type Quote = {
  id: string;
  customer_id: string;
  square_footage: number;
  cleaning_frequency: string;
  extra_services: string[] | null;
  notes: string;
  total_estimate: number;
  status?: "Pending" | "Sent" | "Approved" | "Rejected";
  pricing_snapshot?: Record<string, unknown> | null;
  manual_total_override?: boolean;
  manual_total_override_reason?: string | null;
  created_at: string;
};

type Job = {
  id: string;
  quote_id: string;
  customer_id: string;
  scheduled_date: string;
  assigned_employee_id: string | null;
  assigned_employee: string | null;
  status: string;
  estimated_value: number;
  notes: string;
  created_at: string;
};

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
};

type ApprovalFormState = {
  scheduled_date: string;
  assigned_employee_id: string;
  notes: string;
};

type PricingSettings = {
  tenant_id: string;
  base_service_fee: number;
  price_per_square_foot: number;
  restroom_pricing_mode: "per_restroom" | "per_fixture";
  restroom_unit_price: number;
  kitchen_breakroom_price: number;
  floor_care_price: number;
  carpet_cleaning_price: number;
  window_cleaning_price: number;
  frequency_multiplier_one_time: number;
  frequency_multiplier_daily: number;
  frequency_multiplier_weekly: number;
  frequency_multiplier_biweekly: number;
  frequency_multiplier_monthly: number;
  minimum_job_price: number | null;
  travel_service_fee: number | null;
  tax_rate_percent: number;
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

type QuoteLineItem = {
  item_key: string;
  item_name: string;
  pricing_type: "flat" | "quantity" | "square_foot" | "percentage" | "tax" | "minimum" | "override";
  quantity: number | null;
  unit_price: number | null;
  amount: number;
  customer_description: string | null;
  customer_visible: boolean;
  internal_description: string | null;
  is_override: boolean;
  override_reason: string | null;
};

type PricingBreakdown = {
  computedTotal: number;
  finalTotal: number;
  lineItems: QuoteLineItem[];
};

type QuoteFormState = {
  customer_id: string;
  customer_name: string;
  contact_name: string;
  email: string;
  square_footage: string;
  cleaning_frequency: string;
  extra_services: string[];
  restroom_count: string;
  selected_custom_items: string[];
  custom_item_quantities: Record<string, string>;
  notes: string;
  manual_total_override: boolean;
  manual_total_override_amount: string;
  manual_total_override_reason: string;
};

const emptyForm: QuoteFormState = {
  customer_id: "",
  customer_name: "",
  contact_name: "",
  email: "",
  square_footage: "",
  cleaning_frequency: "weekly",
  extra_services: [],
  restroom_count: "1",
  selected_custom_items: [],
  custom_item_quantities: {},
  notes: "",
  manual_total_override: false,
  manual_total_override_amount: "",
  manual_total_override_reason: "",
};

const baseExtraServiceLabels: Record<string, string> = {
  window_cleaning: "Window cleaning",
  carpet_shampoo: "Carpet cleaning",
  restroom_sanitation: "Restroom sanitation",
  floor_waxing: "Floor care",
  kitchen_breakroom: "Kitchen/breakroom",
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function getFrequencyMultiplier(settings: PricingSettings, frequency: string) {
  if (frequency === "one_time") return settings.frequency_multiplier_one_time;
  if (frequency === "daily") return settings.frequency_multiplier_daily;
  if (frequency === "weekly") return settings.frequency_multiplier_weekly;
  if (frequency === "biweekly") return settings.frequency_multiplier_biweekly;
  if (frequency === "monthly") return settings.frequency_multiplier_monthly;
  return settings.frequency_multiplier_weekly;
}

function getBaseServiceAmount(settings: PricingSettings, key: string, restroomCount: number) {
  if (key === "window_cleaning") return settings.window_cleaning_price;
  if (key === "carpet_shampoo") return settings.carpet_cleaning_price;
  if (key === "floor_waxing") return settings.floor_care_price;
  if (key === "kitchen_breakroom") return settings.kitchen_breakroom_price;
  if (key === "restroom_sanitation") {
    const count = settings.restroom_pricing_mode === "per_fixture" ? restroomCount : restroomCount;
    return settings.restroom_unit_price * count;
  }
  return 0;
}

function calculateBreakdown(
  form: QuoteFormState,
  settings: PricingSettings | null,
  pricingItems: PricingItem[],
): PricingBreakdown {
  if (!settings) {
    return { computedTotal: 0, finalTotal: 0, lineItems: [] };
  }

  const squareFootage = Number(form.square_footage) || 0;
  const restroomCount = Math.max(1, Number(form.restroom_count) || 1);
  const lineItems: QuoteLineItem[] = [];

  if (settings.base_service_fee > 0) {
    lineItems.push({
      item_key: "base_service_fee",
      item_name: "Base service fee",
      pricing_type: "flat",
      quantity: 1,
      unit_price: settings.base_service_fee,
      amount: round2(settings.base_service_fee),
      customer_description: "Base service charge",
      customer_visible: true,
      internal_description: null,
      is_override: false,
      override_reason: null,
    });
  }

  if (squareFootage > 0 && settings.price_per_square_foot > 0) {
    const amount = round2(squareFootage * settings.price_per_square_foot);
    lineItems.push({
      item_key: "square_footage",
      item_name: "Square footage",
      pricing_type: "square_foot",
      quantity: squareFootage,
      unit_price: settings.price_per_square_foot,
      amount,
      customer_description: `Routine cleaning area (${squareFootage} sq ft)`,
      customer_visible: true,
      internal_description: null,
      is_override: false,
      override_reason: null,
    });
  }

  for (const serviceKey of form.extra_services) {
    const baseAmount = getBaseServiceAmount(settings, serviceKey, restroomCount);
    if (baseAmount <= 0) continue;

    lineItems.push({
      item_key: serviceKey,
      item_name: baseExtraServiceLabels[serviceKey] ?? serviceKey,
      pricing_type: serviceKey === "restroom_sanitation" ? "quantity" : "flat",
      quantity: serviceKey === "restroom_sanitation" ? restroomCount : 1,
      unit_price: serviceKey === "restroom_sanitation" ? settings.restroom_unit_price : baseAmount,
      amount: round2(baseAmount),
      customer_description: baseExtraServiceLabels[serviceKey] ?? serviceKey,
      customer_visible: true,
      internal_description:
        serviceKey === "restroom_sanitation"
          ? `Restroom pricing mode: ${settings.restroom_pricing_mode}`
          : null,
      is_override: false,
      override_reason: null,
    });
  }

  for (const itemId of form.selected_custom_items) {
    const item = pricingItems.find((entry) => entry.id === itemId && entry.is_active);
    if (!item) continue;

    const rawQuantity = form.custom_item_quantities[item.id] ?? "1";
    const parsedQuantity = Number(rawQuantity);
    const quantity = item.pricing_type === "flat" ? 1 : Number.isFinite(parsedQuantity) ? parsedQuantity : 0;
    if (item.pricing_type !== "flat" && quantity <= 0) continue;

    let amount = 0;
    if (item.pricing_type === "flat") amount = item.unit_price;
    if (item.pricing_type === "quantity") amount = item.unit_price * quantity;
    if (item.pricing_type === "square_foot") amount = item.unit_price * quantity;
    if (item.pricing_type === "percentage") {
      const subtotal = lineItems.reduce((sum, lineItem) => sum + lineItem.amount, 0);
      amount = subtotal * (item.unit_price / 100);
    }

    lineItems.push({
      item_key: `custom:${item.id}`,
      item_name: item.name,
      pricing_type: item.pricing_type,
      quantity: item.pricing_type === "flat" ? 1 : quantity,
      unit_price: item.unit_price,
      amount: round2(amount),
      customer_description: item.customer_description,
      customer_visible: true,
      internal_description: null,
      is_override: false,
      override_reason: null,
    });
  }

  const subtotalBeforeFrequency = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const frequencyMultiplier = getFrequencyMultiplier(settings, form.cleaning_frequency);
  if (Math.abs(frequencyMultiplier - 1) > 0.0001 && subtotalBeforeFrequency > 0) {
    const adjustment = round2(subtotalBeforeFrequency * (frequencyMultiplier - 1));
    if (adjustment !== 0) {
      lineItems.push({
        item_key: "frequency_adjustment",
        item_name: `Frequency adjustment (${form.cleaning_frequency})`,
        pricing_type: "percentage",
        quantity: 1,
        unit_price: frequencyMultiplier,
        amount: adjustment,
        customer_description: `Service frequency multiplier (${frequencyMultiplier.toFixed(4)})`,
        customer_visible: true,
        internal_description: null,
        is_override: false,
        override_reason: null,
      });
    }
  }

  let preTax = lineItems.reduce((sum, item) => sum + item.amount, 0);

  if (settings.minimum_job_price != null && preTax < settings.minimum_job_price) {
    const minimumGap = round2(settings.minimum_job_price - preTax);
    if (minimumGap > 0) {
      lineItems.push({
        item_key: "minimum_job_price",
        item_name: "Minimum job price adjustment",
        pricing_type: "minimum",
        quantity: 1,
        unit_price: settings.minimum_job_price,
        amount: minimumGap,
        customer_description: "Minimum service amount adjustment",
        customer_visible: true,
        internal_description: null,
        is_override: false,
        override_reason: null,
      });
      preTax += minimumGap;
    }
  }

  if ((settings.travel_service_fee ?? 0) > 0) {
    const travelAmount = round2(settings.travel_service_fee ?? 0);
    lineItems.push({
      item_key: "travel_service_fee",
      item_name: "Travel/service fee",
      pricing_type: "flat",
      quantity: 1,
      unit_price: travelAmount,
      amount: travelAmount,
      customer_description: "Travel and service fee",
      customer_visible: true,
      internal_description: null,
      is_override: false,
      override_reason: null,
    });
    preTax += travelAmount;
  }

  if (settings.tax_rate_percent > 0 && preTax > 0) {
    const taxAmount = round2(preTax * (settings.tax_rate_percent / 100));
    lineItems.push({
      item_key: "tax",
      item_name: "Tax",
      pricing_type: "tax",
      quantity: 1,
      unit_price: settings.tax_rate_percent,
      amount: taxAmount,
      customer_description: `Tax (${settings.tax_rate_percent}%)`,
      customer_visible: true,
      internal_description: null,
      is_override: false,
      override_reason: null,
    });
  }

  const computedTotal = round2(lineItems.reduce((sum, item) => sum + item.amount, 0));

  if (form.manual_total_override) {
    const overrideAmount = Number(form.manual_total_override_amount);
    if (Number.isFinite(overrideAmount)) {
      const delta = round2(overrideAmount - computedTotal);
      if (delta !== 0) {
        lineItems.push({
          item_key: "manual_override",
          item_name: "Manual total override adjustment",
          pricing_type: "override",
          quantity: 1,
          unit_price: null,
          amount: delta,
          customer_description: "Final quote adjustment",
          customer_visible: true,
          internal_description: form.manual_total_override_reason || null,
          is_override: true,
          override_reason: form.manual_total_override_reason || null,
        });
      }
      return { computedTotal, finalTotal: round2(overrideAmount), lineItems };
    }
  }

  return { computedTotal, finalTotal: computedTotal, lineItems };
}

export default function QuotesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pricingItems, setPricingItems] = useState<PricingItem[]>([]);
  const [pricingSettings, setPricingSettings] = useState<PricingSettings | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState<QuoteFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [activeQuote, setActiveQuote] = useState<Quote | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalForm, setApprovalForm] = useState<ApprovalFormState>({
    scheduled_date: "",
    assigned_employee_id: "",
    notes: "",
  });
  const [approvingQuoteId, setApprovingQuoteId] = useState<string | null>(null);

  const pricingBreakdown = useMemo(
    () => calculateBreakdown(form, pricingSettings, pricingItems),
    [form, pricingSettings, pricingItems],
  );

  const fetchCustomers = async () => {
    setCustomersLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch customers:", error);
      setMessage(error.message);
    } else {
      setCustomers(data ?? []);
    }
    setCustomersLoading(false);
  };

  const fetchQuotes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch quotes:", error);
      setMessage(error.message);
    } else {
      setQuotes((data ?? []) as Quote[]);
    }

    setLoading(false);
  };

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("id,first_name,last_name,is_active")
      .eq("is_active", true)
      .order("first_name", { ascending: true });

    if (error) {
      console.error("Failed to fetch employees:", error);
      return;
    }

    setEmployees(data ?? []);
  };

  const fetchPricing = async () => {
    setPricingLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    setUserId(session?.user.id ?? null);

    const { data: rpcTenantId, error: tenantError } = await supabase.rpc("current_tenant_id");
    if (tenantError || !rpcTenantId) {
      setMessage(tenantError?.message ?? "Unable to resolve tenant for quote pricing.");
      setPricingLoading(false);
      return;
    }

    setTenantId(rpcTenantId);

    let { data: settingsRow, error: settingsError } = await supabase
      .from("quote_pricing_settings")
      .select("*")
      .eq("tenant_id", rpcTenantId)
      .maybeSingle();

    if (settingsError) {
      setMessage(settingsError.message);
      setPricingLoading(false);
      return;
    }

    if (!settingsRow) {
      const { data: inserted, error: insertError } = await supabase
        .from("quote_pricing_settings")
        .insert({ tenant_id: rpcTenantId })
        .select("*")
        .single();

      if (insertError) {
        setMessage(insertError.message);
        setPricingLoading(false);
        return;
      }

      settingsRow = inserted;
    }

    const { data: itemRows, error: itemsError } = await supabase
      .from("quote_pricing_items")
      .select("id,name,pricing_type,unit_price,customer_description,is_active,sort_order")
      .eq("tenant_id", rpcTenantId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (itemsError) {
      setMessage(itemsError.message);
      setPricingLoading(false);
      return;
    }

    setPricingSettings(settingsRow as PricingSettings);
    setPricingItems((itemRows ?? []) as PricingItem[]);
    setPricingLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
    fetchQuotes();
    fetchEmployees();
    fetchPricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCustomerSelect = (customerId: string) => {
    const selected = customers.find((c) => c.id === customerId);
    if (selected) {
      setForm((current) => ({
        ...current,
        customer_id: customerId,
        customer_name: selected.company_name,
        contact_name: selected.contact_name,
        email: selected.email,
      }));
    } else {
      setForm((current) => ({
        ...current,
        customer_id: "",
        customer_name: "",
        contact_name: "",
        email: "",
      }));
    }
  };

  const persistLineItems = async (quoteId: string, lineItems: QuoteLineItem[]) => {
    if (!tenantId) return;

    const { error: deleteError } = await supabase.from("quote_line_items").delete().eq("quote_id", quoteId);
    if (deleteError) {
      throw new Error(`Failed to clear existing line items: ${deleteError.message}`);
    }

    if (lineItems.length === 0) return;

    const payload = lineItems.map((item) => ({
      quote_id: quoteId,
      tenant_id: tenantId,
      item_key: item.item_key,
      item_name: item.item_name,
      pricing_type: item.pricing_type,
      quantity: item.quantity,
      unit_price: item.unit_price,
      amount: item.amount,
      customer_description: item.customer_description,
      customer_visible: item.customer_visible,
      internal_description: item.internal_description,
      is_override: item.is_override,
      override_reason: item.override_reason,
      created_by: userId,
    }));

    const { error: insertError } = await supabase.from("quote_line_items").insert(payload);
    if (insertError) {
      throw new Error(`Failed to save quote line items: ${insertError.message}`);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    if (!form.customer_id || !form.square_footage) {
      setMessage("Please select a customer and enter square footage.");
      setSaving(false);
      return;
    }

    if (form.manual_total_override) {
      if (!form.manual_total_override_reason.trim()) {
        setMessage("Manual override reason is required.");
        setSaving(false);
        return;
      }

      const overrideAmount = Number(form.manual_total_override_amount);
      if (!Number.isFinite(overrideAmount) || overrideAmount < 0) {
        setMessage("Enter a valid manual override total.");
        setSaving(false);
        return;
      }
    }

    if (!pricingSettings) {
      setMessage("Pricing settings are not loaded yet.");
      setSaving(false);
      return;
    }

    const selectedCustomItems = pricingItems
      .filter((item) => form.selected_custom_items.includes(item.id))
      .map((item) => ({
        id: item.id,
        name: item.name,
        pricing_type: item.pricing_type,
        unit_price: item.unit_price,
        quantity: form.custom_item_quantities[item.id] ?? "1",
      }));

    const snapshot = {
      version: 1,
      generated_at: new Date().toISOString(),
      square_footage: Number(form.square_footage),
      cleaning_frequency: form.cleaning_frequency,
      restroom_count: Number(form.restroom_count) || 1,
      selected_extra_services: form.extra_services,
      selected_custom_items: selectedCustomItems,
      pricing_settings: {
        base_service_fee: pricingSettings.base_service_fee,
        price_per_square_foot: pricingSettings.price_per_square_foot,
        restroom_pricing_mode: pricingSettings.restroom_pricing_mode,
        restroom_unit_price: pricingSettings.restroom_unit_price,
        kitchen_breakroom_price: pricingSettings.kitchen_breakroom_price,
        floor_care_price: pricingSettings.floor_care_price,
        carpet_cleaning_price: pricingSettings.carpet_cleaning_price,
        window_cleaning_price: pricingSettings.window_cleaning_price,
        frequency_multiplier_one_time: pricingSettings.frequency_multiplier_one_time,
        frequency_multiplier_daily: pricingSettings.frequency_multiplier_daily,
        frequency_multiplier_weekly: pricingSettings.frequency_multiplier_weekly,
        frequency_multiplier_biweekly: pricingSettings.frequency_multiplier_biweekly,
        frequency_multiplier_monthly: pricingSettings.frequency_multiplier_monthly,
        minimum_job_price: pricingSettings.minimum_job_price,
        travel_service_fee: pricingSettings.travel_service_fee,
        tax_rate_percent: pricingSettings.tax_rate_percent,
      },
      computed_total: pricingBreakdown.computedTotal,
      final_total: pricingBreakdown.finalTotal,
      manual_override: form.manual_total_override
        ? {
            enabled: true,
            amount: Number(form.manual_total_override_amount),
            reason: form.manual_total_override_reason.trim(),
          }
        : { enabled: false },
      line_items: pricingBreakdown.lineItems,
    };

    const payload = {
      customer_id: form.customer_id,
      square_footage: Number(form.square_footage),
      cleaning_frequency: form.cleaning_frequency,
      extra_services: form.extra_services,
      notes: form.notes.trim(),
      total_estimate: pricingBreakdown.finalTotal,
      pricing_snapshot: snapshot,
      manual_total_override: form.manual_total_override,
      manual_total_override_reason: form.manual_total_override
        ? form.manual_total_override_reason.trim()
        : null,
      ...(editingId ? {} : { status: "Pending" as const }),
    };

    try {
      let quoteId = editingId;

      if (editingId) {
        const { error } = await supabase.from("quotes").update(payload).eq("id", editingId);
        if (error) throw new Error(`Error updating quote: ${error.message}`);
      } else {
        const { data, error } = await supabase
          .from("quotes")
          .insert(payload)
          .select("id")
          .single();
        if (error || !data) throw new Error(`Error saving quote: ${error?.message ?? "No quote id returned"}`);
        quoteId = data.id;
      }

      if (!quoteId) throw new Error("Unable to resolve quote id for line item save.");
      await persistLineItems(quoteId, pricingBreakdown.lineItems);

      setForm(emptyForm);
      setEditingId(null);
      setMessage(editingId ? "Quote updated successfully." : "Quote saved successfully.");
      await fetchQuotes();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unknown error";
      setMessage(text);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (quote: Quote) => {
    const customer = customers.find((c) => c.id === quote.customer_id);
    const snapshot = quote.pricing_snapshot ?? {};
    const record = typeof snapshot === "object" && snapshot !== null ? snapshot : {};

    const selectedCustomItems = Array.isArray((record as { selected_custom_items?: unknown }).selected_custom_items)
      ? ((record as { selected_custom_items: Array<{ id?: string; quantity?: string | number }> }).selected_custom_items
          .map((entry) => entry.id)
          .filter((id): id is string => Boolean(id)))
      : [];

    const customQuantities: Record<string, string> = {};
    if (Array.isArray((record as { selected_custom_items?: unknown }).selected_custom_items)) {
      for (const entry of (record as { selected_custom_items: Array<{ id?: string; quantity?: string | number }> })
        .selected_custom_items) {
        if (entry.id) {
          customQuantities[entry.id] = entry.quantity == null ? "1" : String(entry.quantity);
        }
      }
    }

    const manualOverride = quote.manual_total_override ?? false;

    setEditingId(quote.id);
    setForm({
      customer_id: quote.customer_id,
      customer_name: customer?.company_name || "",
      contact_name: customer?.contact_name || "",
      email: customer?.email || "",
      square_footage: String(quote.square_footage),
      cleaning_frequency: quote.cleaning_frequency,
      extra_services: quote.extra_services ?? [],
      restroom_count: String((record as { restroom_count?: number }).restroom_count ?? 1),
      selected_custom_items: selectedCustomItems,
      custom_item_quantities: customQuantities,
      notes: quote.notes,
      manual_total_override: manualOverride,
      manual_total_override_amount: manualOverride ? String(quote.total_estimate) : "",
      manual_total_override_reason: quote.manual_total_override_reason ?? "",
    });
    setActiveQuote(quote);
    setMessage("Editing saved quote.");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("quotes").delete().eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Quote deleted.");
    await fetchQuotes();
    if (activeQuote?.id === id) {
      setActiveQuote(null);
    }
  };

  const handlePrint = (quote: Quote) => {
    setActiveQuote(quote);
    window.print();
  };

  const handleEmail = (quote: Quote) => {
    const customer = customers.find((c) => c.id === quote.customer_id);
    const customerName = customer?.company_name || "Customer";
    const contactName = customer?.contact_name || "Contact";
    const email = customer?.email || "";

    if (!email) {
      setMessage("No email address available for this customer.");
      return;
    }

    const subject = encodeURIComponent(`Cleaning estimate for ${customerName}`);
    const body = encodeURIComponent(
      `Hello ${contactName},\n\nHere is your commercial cleaning estimate:\n- Company: ${customerName}\n- Square footage: ${quote.square_footage}\n- Frequency: ${quote.cleaning_frequency}\n- Estimated total: ${formatCurrency(quote.total_estimate)}\n\nThanks,\nServiceOS`,
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const handleApproveClick = (quote: Quote) => {
    setApprovingQuoteId(quote.id);
    setApprovalForm({
      scheduled_date: new Date().toISOString().split("T")[0],
      assigned_employee_id: "",
      notes: quote.notes || "",
    });
    setShowApprovalModal(true);
  };

  const handleApproveSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!approvingQuoteId) return;

    setSaving(true);
    setMessage(null);

    const quote = quotes.find((q) => q.id === approvingQuoteId);
    if (!quote) {
      setMessage("Quote not found.");
      setSaving(false);
      return;
    }

    if (!approvalForm.scheduled_date) {
      setMessage("Please select a scheduled date.");
      setSaving(false);
      return;
    }

    const selectedEmployee = employees.find((employee) => employee.id === approvalForm.assigned_employee_id);

    const jobPayload = {
      quote_id: quote.id,
      customer_id: quote.customer_id,
      scheduled_date: approvalForm.scheduled_date,
      assigned_employee_id: approvalForm.assigned_employee_id || null,
      assigned_employee: selectedEmployee
        ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}`
        : null,
      status: "Scheduled",
      estimated_value: quote.total_estimate,
      notes: approvalForm.notes,
    };

    const { error: jobError } = await supabase.from("jobs").insert(jobPayload);

    if (jobError) {
      setMessage(`Error approving quote: ${jobError.message}`);
      setSaving(false);
      return;
    }

    const { error: quoteStatusError } = await supabase
      .from("quotes")
      .update({ status: "Approved" })
      .eq("id", quote.id);

    if (quoteStatusError) {
      setMessage(`Job created but quote status update failed: ${quoteStatusError.message}`);
      setSaving(false);
      return;
    }

    setMessage("Quote approved and job created successfully.");
    setShowApprovalModal(false);
    setApprovingQuoteId(null);
    setSaving(false);
    await fetchQuotes();
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setMessage(null);
  };

  const toggleService = (service: string) => {
    setForm((current) => ({
      ...current,
      extra_services: current.extra_services.includes(service)
        ? current.extra_services.filter((item) => item !== service)
        : [...current.extra_services, service],
    }));
  };

  const toggleCustomItem = (itemId: string) => {
    setForm((current) => ({
      ...current,
      selected_custom_items: current.selected_custom_items.includes(itemId)
        ? current.selected_custom_items.filter((entry) => entry !== itemId)
        : [...current.selected_custom_items, itemId],
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Quote generator</p>
            <h1 className="text-2xl font-semibold text-slate-900">Commercial cleaning estimates</h1>
          </div>
          <div className="flex gap-3">
            <Link
              href="/quote-pricing"
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Pricing settings
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Back to dashboard
            </Link>
          </div>
        </header>

        {message ? (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {message}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Build a quote</h2>
                <p className="text-sm text-slate-500">
                  Estimate pricing from tenant configuration and save a full line-item snapshot.
                </p>
              </div>
              <div className="rounded-2xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
                {pricingLoading ? "Loading..." : formatCurrency(pricingBreakdown.finalTotal)}
              </div>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Select a customer</label>
                <select
                  value={form.customer_id}
                  onChange={(event) => handleCustomerSelect(event.target.value)}
                  disabled={customersLoading}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">{customersLoading ? "Loading customers..." : "Choose a customer..."}</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.company_name} ({customer.contact_name})
                    </option>
                  ))}
                </select>
              </div>

              {form.customer_id ? (
                <div className="grid gap-4 rounded-2xl bg-slate-50 p-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Company</label>
                    <p className="text-sm text-slate-900">{form.customer_name}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Contact</label>
                    <p className="text-sm text-slate-900">{form.contact_name}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600">Email</label>
                    <p className="text-sm text-slate-900">{form.email}</p>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Square footage</label>
                  <input
                    type="number"
                    min="0"
                    value={form.square_footage}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        square_footage: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                    placeholder="25000"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Cleaning frequency</label>
                  <select
                    value={form.cleaning_frequency}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        cleaning_frequency: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="one_time">One-time</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Base extra services</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(baseExtraServiceLabels).map(([service, label]) => (
                    <label
                      key={service}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={form.extra_services.includes(service)}
                        onChange={() => toggleService(service)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {form.extra_services.includes("restroom_sanitation") ? (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Restroom count</label>
                  <input
                    type="number"
                    min="1"
                    value={form.restroom_count}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        restroom_count: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                </div>
              ) : null}

              {pricingItems.filter((item) => item.is_active).length > 0 ? (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Custom pricing services</label>
                  <div className="space-y-2">
                    {pricingItems
                      .filter((item) => item.is_active)
                      .map((item) => {
                        const selected = form.selected_custom_items.includes(item.id);
                        return (
                          <div
                            key={item.id}
                            className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:grid-cols-[1fr_140px]"
                          >
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleCustomItem(item.id)}
                              />
                              <span>
                                {item.name} ({item.pricing_type} @ {item.unit_price})
                              </span>
                            </label>
                            {item.pricing_type === "flat" ? (
                              <div className="text-sm text-slate-500">Flat rate</div>
                            ) : (
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                disabled={!selected}
                                value={form.custom_item_quantities[item.id] ?? "1"}
                                onChange={(event) =>
                                  setForm((current) => ({
                                    ...current,
                                    custom_item_quantities: {
                                      ...current.custom_item_quantities,
                                      [item.id]: event.target.value,
                                    },
                                  }))
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                                placeholder="Quantity"
                              />
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-amber-900">
                  <input
                    type="checkbox"
                    checked={form.manual_total_override}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        manual_total_override: event.target.checked,
                        manual_total_override_amount: event.target.checked
                          ? String(pricingBreakdown.finalTotal)
                          : "",
                        manual_total_override_reason: event.target.checked
                          ? current.manual_total_override_reason
                          : "",
                      }))
                    }
                  />
                  Manual total override
                </label>
                {form.manual_total_override ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.manual_total_override_amount}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          manual_total_override_amount: event.target.value,
                        }))
                      }
                      className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400"
                      placeholder="Override total"
                    />
                    <input
                      type="text"
                      value={form.manual_total_override_reason}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          manual_total_override_reason: event.target.value,
                        }))
                      }
                      className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400"
                      placeholder="Internal reason (required)"
                    />
                  </div>
                ) : null}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  className="min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  placeholder="Special requirements, access instructions, or service notes"
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving || pricingLoading}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {saving ? "Saving..." : editingId ? "Update quote" : "Save quote"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Clear
                </button>
              </div>
            </form>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Quote preview</h2>
              <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Computed total</span>
                  <span className="text-lg font-semibold text-slate-900">
                    {formatCurrency(pricingBreakdown.computedTotal)}
                  </span>
                </div>
                {form.manual_total_override ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Manual total</span>
                    <span className="text-2xl font-semibold text-amber-700">
                      {formatCurrency(pricingBreakdown.finalTotal)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Estimated total</span>
                    <span className="text-2xl font-semibold text-slate-900">
                      {formatCurrency(pricingBreakdown.finalTotal)}
                    </span>
                  </div>
                )}

                {pricingBreakdown.lineItems.length > 0 ? (
                  <div className="pt-2">
                    <p className="text-sm font-medium text-slate-700">Line items</p>
                    <div className="mt-2 space-y-1">
                      {pricingBreakdown.lineItems.map((item) => (
                        <div key={`${item.item_key}-${item.item_name}`} className="flex items-start justify-between text-sm">
                          <div>
                            <p className="text-slate-700">{item.item_name}</p>
                            {item.customer_description ? (
                              <p className="text-xs text-slate-500">{item.customer_description}</p>
                            ) : null}
                          </div>
                          <span className={item.amount < 0 ? "text-rose-600" : "text-slate-900"}>
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">Enter quote inputs to generate line items.</p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Saved quotes</h2>
                  <p className="text-sm text-slate-500">Manage and send your estimates.</p>
                </div>
              </div>

              {loading ? (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Loading quotes...</div>
              ) : quotes.length === 0 ? (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No quotes saved yet.</div>
              ) : (
                <div className="mt-4 space-y-3">
                  {quotes.map((quote) => {
                    const customer = customers.find((c) => c.id === quote.customer_id);
                    return (
                      <div key={quote.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{customer?.company_name || "Unknown"}</p>
                            <p className="text-sm text-slate-500">{customer?.contact_name || ""}</p>
                            <p className="mt-1 text-sm text-slate-600">
                              {quote.square_footage} sq ft • {quote.cleaning_frequency}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                              Status: {quote.status ?? "Pending"}
                            </p>
                            <p className="mt-2 text-lg font-semibold text-slate-900">
                              {formatCurrency(quote.total_estimate)}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(quote)}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePrint(quote)}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                            >
                              Print
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEmail(quote)}
                              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                            >
                              Email
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApproveClick(quote)}
                              className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(quote.id)}
                              className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-100"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {showApprovalModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Approve Quote and Create Job</h2>
            <p className="mt-1 text-sm text-slate-500">Schedule this cleaning job for approval.</p>

            {message ? (
              <div className="mt-4 rounded-2xl border border-yellow-100 bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
                {message}
              </div>
            ) : null}

            <form className="mt-4 space-y-4" onSubmit={handleApproveSubmit}>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Scheduled date</label>
                <input
                  type="date"
                  required
                  value={approvalForm.scheduled_date}
                  onChange={(event) =>
                    setApprovalForm((current) => ({
                      ...current,
                      scheduled_date: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Assigned employee (optional)</label>
                <select
                  value={approvalForm.assigned_employee_id}
                  onChange={(event) =>
                    setApprovalForm((current) => ({
                      ...current,
                      assigned_employee_id: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:bg-white"
                >
                  <option value="">Unassigned</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.first_name} {employee.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Job notes</label>
                <textarea
                  value={approvalForm.notes}
                  onChange={(event) =>
                    setApprovalForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  className="min-h-20 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:bg-white"
                  placeholder="Special instructions or requirements..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-400"
                >
                  {saving ? "Creating job..." : "Approve and Create Job"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowApprovalModal(false);
                    setApprovingQuoteId(null);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
