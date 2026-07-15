"use client";

import { useActionState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { submitDemoRequest } from "@/app/contact/actions";
import { contactInitialState } from "@/app/contact/form-state";
import { useI18n } from "@/components/i18n-provider";
import { trackAnalyticsEvent } from "@/lib/analytics";

export function ContactForm() {
  const { t, language } = useI18n();
  const searchParams = useSearchParams();
  const [state, formAction, pending] = useActionState(submitDemoRequest, contactInitialState);
  const formRef = useRef<HTMLFormElement>(null);

  const leadSource = useMemo(() => {
    const raw = searchParams.get("source")?.trim().toLowerCase();
    if (raw === "demo_request") return "demo_request";
    if (raw === "founding_partner") return "founding_partner";
    return "website_contact";
  }, [searchParams]);

  const businessTypes = [
    t("public.contactBusinessResidential"),
    t("public.contactBusinessCommercial"),
    "HVAC",
    "Plumbing",
    "Electrical",
    "Landscaping",
    t("public.contactBusinessOther"),
  ];

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  useEffect(() => {
    if (!state.success) return;

    if (leadSource === "demo_request") {
      trackAnalyticsEvent("demo_request_submitted", { source: leadSource });
      return;
    }

    if (leadSource === "founding_partner") {
      trackAnalyticsEvent("founding_partner_application_submitted", { source: leadSource });
      return;
    }

    trackAnalyticsEvent("lead_form_submitted", { source: leadSource });
  }, [leadSource, state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="language" value={language} />
      <input type="hidden" name="leadSource" value={leadSource} />
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" autoComplete="off" tabIndex={-1} />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
            {t("public.contactName")}
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            aria-invalid={state.fieldErrors?.name ? true : undefined}
            aria-describedby={state.fieldErrors?.name ? "name-error" : undefined}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          {state.fieldErrors?.name ? (
            <p id="name-error" className="mt-1 text-xs text-rose-700">
              {state.fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="company" className="mb-1.5 block text-sm font-medium text-slate-700">
            {t("public.contactCompany")}
          </label>
          <input
            id="company"
            name="company"
            type="text"
            required
            aria-invalid={state.fieldErrors?.company ? true : undefined}
            aria-describedby={state.fieldErrors?.company ? "company-error" : undefined}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          {state.fieldErrors?.company ? (
            <p id="company-error" className="mt-1 text-xs text-rose-700">
              {state.fieldErrors.company}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
            {t("public.contactEmail")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            aria-invalid={state.fieldErrors?.email ? true : undefined}
            aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          {state.fieldErrors?.email ? (
            <p id="email-error" className="mt-1 text-xs text-rose-700">
              {state.fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-slate-700">
            {t("public.contactPhoneOptional")}
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="employeeCount" className="mb-1.5 block text-sm font-medium text-slate-700">
            {t("public.contactEmployeeCount")}
          </label>
          <input
            id="employeeCount"
            name="employeeCount"
            type="text"
            required
            placeholder={t("public.contactEmployeeCountPlaceholder")}
            aria-invalid={state.fieldErrors?.employeeCount ? true : undefined}
            aria-describedby={state.fieldErrors?.employeeCount ? "employeeCount-error" : undefined}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          {state.fieldErrors?.employeeCount ? (
            <p id="employeeCount-error" className="mt-1 text-xs text-rose-700">
              {state.fieldErrors.employeeCount}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="businessType" className="mb-1.5 block text-sm font-medium text-slate-700">
            {t("public.contactBusinessType")}
          </label>
          <select
            id="businessType"
            name="businessType"
            required
            defaultValue=""
            aria-invalid={state.fieldErrors?.businessType ? true : undefined}
            aria-describedby={state.fieldErrors?.businessType ? "businessType-error" : undefined}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="" disabled>
              {t("public.contactSelectBusinessType")}
            </option>
            {businessTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {state.fieldErrors?.businessType ? (
            <p id="businessType-error" className="mt-1 text-xs text-rose-700">
              {state.fieldErrors.businessType}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-slate-700">
          {t("public.contactMessage")}
        </label>
        <textarea
          id="message"
          name="message"
          required
          minLength={10}
          rows={5}
          aria-invalid={state.fieldErrors?.message ? true : undefined}
          aria-describedby={state.fieldErrors?.message ? "message-error" : undefined}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder={t("public.contactMessagePlaceholder")}
        />
        {state.fieldErrors?.message ? (
          <p id="message-error" className="mt-1 text-xs text-rose-700">
            {state.fieldErrors.message}
          </p>
        ) : null}
      </div>

      {state.message ? (
        <p
          role="status"
          className={`rounded-xl px-4 py-3 text-sm ${
            state.success ? "border border-emerald-200 bg-emerald-50 text-emerald-900" : "border border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {pending ? t("public.contactSubmitting") : t("public.contactRequestDemo")}
      </button>
    </form>
  );
}
