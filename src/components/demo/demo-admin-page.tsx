"use client";

import Link from "next/link";
import { DemoAccountBadge } from "@/components/demo/demo-account-badge";
import { useDemoSession } from "@/components/demo/demo-session-provider";
import { useI18n } from "@/components/i18n-provider";
import {
  demoAdminMetrics,
  demoCompany,
  demoCustomers,
  demoQuote,
  demoRecentActivityKeys,
  demoRevenueHistory,
  demoUpcomingJobs,
} from "@/lib/demo-fixtures";

function formatCurrency(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function RevenueChart({
  locale,
  t,
}: {
  locale: string;
  t: (key: string) => string;
}) {
  const max = Math.max(...demoRevenueHistory.map((entry) => entry.revenue));

  return (
    <div className="flex h-56 items-end gap-3">
      {demoRevenueHistory.map((entry) => (
        <div
          key={entry.monthKey}
          className="flex flex-1 flex-col items-center gap-2"
        >
          <span className="text-[11px] font-semibold text-slate-500">
            {formatCurrency(entry.revenue, locale)}
          </span>
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-xl bg-gradient-to-t from-blue-700 to-cyan-400"
              style={{ height: `${Math.max((entry.revenue / max) * 100, 8)}%` }}
            />
          </div>
          <span className="text-xs text-slate-500">{t(entry.monthKey)}</span>
        </div>
      ))}
    </div>
  );
}

const ownerWins = {
  en: [
    "See job completion, proof photos, and invoice status without waiting for text updates",
    "Give office managers and field leads role-specific visibility without over-sharing",
    "Follow quote-to-cash performance daily so you can coach and scale faster",
  ],
  es: [
    "Ve finalizacion, fotos de evidencia y estado de cobro sin depender de mensajes",
    "Da visibilidad por rol a oficina y lideres de campo sin compartir de mas",
    "Sigue cotizacion-a-cobro a diario para mejorar ejecucion y escalar mas rapido",
  ],
};

export function DemoAdminPage() {
  const { data } = useDemoSession();
  const { t, locale } = useI18n();
  const language = locale === "es" ? "es" : "en";

  const updatedRevenue =
    demoCompany.monthlyRevenue + (data.invoicePaid ? 1940 : 0);
  const updatedOutstanding = Math.max(2375 - (data.invoicePaid ? 1940 : 0), 0);
  const updatedCompletionRate = data.employeeJobCompleted
    ? 97
    : demoCompany.completionRate;

  const metrics = demoAdminMetrics.map((metric) => {
    if (metric.labelKey === "public.demoMetricMonthlyRevenue") {
      return { ...metric, value: formatCurrency(updatedRevenue, locale) };
    }
    if (metric.labelKey === "public.demoMetricOutstandingInvoices") {
      return { ...metric, value: formatCurrency(updatedOutstanding, locale) };
    }
    if (metric.labelKey === "public.demoMetricCompletionRate") {
      return { ...metric, value: `${updatedCompletionRate}%` };
    }
    return metric;
  });

  const wins = ownerWins[language];

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <DemoAccountBadge />
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            {t("public.demoPortalOwnerTitle")}
          </span>
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-slate-950 sm:text-4xl">
          {demoCompany.name} {t("public.demoAdminDashboard")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
          {t("public.demoPortalOwnerDescription")}
        </p>
        <div className="mt-5 grid gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950 sm:grid-cols-2 lg:grid-cols-3">
          <p>
            <span className="font-semibold">{t("public.demoLabelOwner")}:</span>{" "}
            {demoCompany.owner}
          </p>
          <p>
            <span className="font-semibold">
              {t("public.demoLabelServiceArea")}:
            </span>{" "}
            {demoCompany.serviceArea}
          </p>
          <p>
            <span className="font-semibold">
              {t("public.demoLabelJobsThisMonth")}:
            </span>{" "}
            {demoCompany.jobsThisMonth}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="flex-1 text-sm text-slate-700">
            {t("public.demoAdminConversionPrompt")}
          </p>
          <Link
            href="/signup?source=demo-admin"
            className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {t("public.demoCtaStartFounderWorkspace")}
          </Link>
          <Link
            href="/pricing#founding-partners"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-blue-300 hover:text-blue-700"
          >
            {t("public.demoCtaFounderPricing")}
          </Link>
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">
            {language === "en"
              ? "Why owners convert after this view"
              : "Por que propietarios convierten despues de esta vista"}
          </p>
          <div className="mt-2 grid gap-2 lg:grid-cols-3">
            {wins.map((win) => (
              <p
                key={win}
                className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                {win}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article
            key={metric.labelKey}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
              {t(metric.labelKey)}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {metric.value}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            {t("public.demoRevenueLastSixMonths")}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {t("public.demoRevenueSubtitle")}
          </p>
          <div className="mt-6">
            <RevenueChart locale={locale} t={t} />
          </div>
        </article>

        <article className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-amber-900">
            {t("public.demoSafetyControls")}
          </h2>
          <p className="mt-3 text-sm text-amber-800">
            {t("public.demoSafetyControlsDescription")}
          </p>
          <div className="mt-4 space-y-2">
            <button
              type="button"
              disabled
              className="w-full rounded-xl border border-amber-300 bg-white px-4 py-2 text-left text-sm font-semibold text-amber-700 opacity-70"
            >
              {t("public.demoDisabledInvoiceReminder")}
            </button>
            <button
              type="button"
              disabled
              className="w-full rounded-xl border border-amber-300 bg-white px-4 py-2 text-left text-sm font-semibold text-amber-700 opacity-70"
            >
              {t("public.demoDisabledInviteEmployee")}
            </button>
            <button
              type="button"
              disabled
              className="w-full rounded-xl border border-amber-300 bg-white px-4 py-2 text-left text-sm font-semibold text-amber-700 opacity-70"
            >
              {t("public.demoDisabledDeleteCustomer")}
            </button>
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            {t("public.demoUpcomingJobs")}
          </h2>
          <div className="mt-4 space-y-3">
            {demoUpcomingJobs.map((job) => {
              const isLakesideJob = job.customer === "Lakeside Medical Center";
              const statusKey =
                isLakesideJob && data.employeeJobCompleted
                  ? "public.demoStatusCompleted"
                  : job.status === "confirmed"
                    ? "public.demoStatusConfirmed"
                    : "public.demoStatusScheduled";

              return (
                <div
                  key={job.customer}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {job.customer}
                      </p>
                      <p className="text-sm text-slate-600">{t(job.timeKey)}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        statusKey === "public.demoStatusCompleted"
                          ? "bg-emerald-50 text-emerald-700"
                          : statusKey === "public.demoStatusConfirmed"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {t(statusKey)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    {t(job.serviceKey)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {t("public.demoAssignedTo")}{" "}
                    {job.assignedTo.join(` ${t("public.demoListAnd")} `)}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {t("public.demoLabelValue")}{" "}
                    {formatCurrency(job.value, locale)}
                  </p>
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            {t("public.demoRecentActivity")}
          </h2>
          <ul className="mt-4 space-y-3">
            {demoRecentActivityKeys.map((activityKey) => (
              <li
                key={activityKey}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
              >
                {t(activityKey)}
              </li>
            ))}
            {data.quoteApproved ? (
              <li className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {t("public.demoQuoteApprovedActivity")}
              </li>
            ) : null}
            {data.invoicePaid ? (
              <li className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {t("public.demoInvoicePaidActivity")}
              </li>
            ) : null}
          </ul>
        </article>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">
          {t("public.demoCustomersTitle")}
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {demoCustomers.map((customer) => (
            <article
              key={customer.name}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">
                    {customer.name}
                  </p>
                  <p className="text-sm text-slate-600">{customer.contact}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    customer.status === "active"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {customer.status === "active"
                    ? t("public.demoStatusActive")
                    : t("public.demoStatusProspect")}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{customer.email}</p>
              <p className="text-sm text-slate-600">{customer.phone}</p>
              <p className="mt-1 text-sm text-slate-700">
                {t("public.demoLabelService")} {t(customer.serviceKey)}
              </p>
              {customer.frequencyKey ? (
                <p className="text-sm text-slate-600">
                  {t("public.demoLabelFrequency")} {t(customer.frequencyKey)}
                </p>
              ) : null}
              {customer.monthlyValue ? (
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {t("public.demoLabelMonthlyValue")}{" "}
                  {formatCurrency(customer.monthlyValue, locale)}
                </p>
              ) : null}
              {customer.estimatedMonthlyValue ? (
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {t("public.demoLabelEstimatedMonthlyValue")}{" "}
                  {formatCurrency(customer.estimatedMonthlyValue, locale)}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">
          {t("public.demoQuoteDemonstration")} - {demoQuote.id}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {t("public.demoLabelStatus")}{" "}
          {data.quoteApproved
            ? t("public.demoStatusApprovedSessionOnly")
            : t("public.demoStatusAwaitingApproval")}
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p>
              <span className="font-semibold">
                {t("public.demoLabelCustomer")}:
              </span>{" "}
              {demoQuote.customer}
            </p>
            <p>
              <span className="font-semibold">
                {t("public.demoLabelSquareFootage")}:
              </span>{" "}
              {demoQuote.squareFeet.toLocaleString(locale)} {t("public.sqFt")}
            </p>
            <p>
              <span className="font-semibold">
                {t("public.demoLabelFrequency")}:
              </span>{" "}
              {t(demoQuote.frequencyKey)}
            </p>
            <p>
              <span className="font-semibold">
                {t("public.demoLabelEstimatedMonthlyPrice")}:
              </span>{" "}
              {formatCurrency(demoQuote.estimatedMonthlyPrice, locale)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">
              {t("public.demoLabelScope")}
            </p>
            <ul className="mt-2 space-y-1">
              {demoQuote.scopeKeys.map((itemKey) => (
                <li key={itemKey}>- {t(itemKey)}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="flex-1 text-sm text-slate-700">
            {language === "en"
              ? "Want this exact quote-to-close process for your team this month?"
              : "Quieres este proceso de cotizar-a-cierre para tu equipo este mes?"}
          </p>
          <Link
            href="/signup?source=demo-admin-quote"
            className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {t("public.demoCtaStartFounderWorkspace")}
          </Link>
        </div>
      </section>
    </div>
  );
}
