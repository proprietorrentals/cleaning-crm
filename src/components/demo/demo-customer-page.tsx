"use client";

import Link from "next/link";
import { useState } from "react";
import { DemoAccountBadge } from "@/components/demo/demo-account-badge";
import { useDemoSession } from "@/components/demo/demo-session-provider";
import { useI18n } from "@/components/i18n-provider";
import {
  demoAfterPhotos,
  demoBeforePhotos,
  demoCustomerPortal,
  demoInvoice,
} from "@/lib/demo-fixtures";

const customerProof = {
  en: [
    "Customers can approve, track, and pay without back-and-forth calls",
    "Before/after proof reduces disputes and shortens payment cycles",
    "Service requests route to your team with complete context",
  ],
  es: [
    "Tus clientes aprueban, siguen y pagan sin llamadas de ida y vuelta",
    "La evidencia antes/despues reduce disputas y acelera cobro",
    "Solicitudes de servicio llegan al equipo con contexto completo",
  ],
};

function formatCurrency(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(isoDate: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${isoDate}T00:00:00`));
}

export function DemoCustomerPage() {
  const { t, locale } = useI18n();
  const language = locale === "es" ? "es" : "en";
  const { data, updateSession } = useDemoSession();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [serviceRequestSubmitted, setServiceRequestSubmitted] = useState(false);

  const invoiceStatus = data.invoicePaid
    ? t("public.demoStatusPaid")
    : t("public.demoStatusDue");
  const serviceHistory = demoCustomerPortal.serviceHistoryKeys;
  const completionChecklist = demoCustomerPortal.completionChecklistKeys;
  const proofList = customerProof[language];

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <DemoAccountBadge />
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            {t("public.demoPortalCustomerTitle")}
          </span>
        </div>

        <h1 className="mt-4 text-3xl font-semibold text-slate-950 sm:text-4xl">
          {demoCustomerPortal.user} - {t("public.demoCustomerPortal")}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {t("public.demoLabelCompany")} {demoCustomerPortal.company}
        </p>

        <div className="mt-5 grid gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950 sm:grid-cols-2 lg:grid-cols-4">
          <p>
            <span className="font-semibold">
              {t("public.demoLabelNextScheduledService")}:
            </span>{" "}
            {t(demoCustomerPortal.nextServiceKey)}
          </p>
          <p>
            <span className="font-semibold">
              {t("public.demoLabelCurrentJobStatus")}:
            </span>{" "}
            {data.employeeJobCompleted
              ? t("public.demoStatusCompleted")
              : t("public.demoStatusReadyToStart")}
          </p>
          <p>
            <span className="font-semibold">
              {t("public.demoLabelApprovedQuotes")}:
            </span>{" "}
            {demoCustomerPortal.approvedQuotes.join(", ")}
          </p>
          <p>
            <span className="font-semibold">
              {t("public.demoLabelRequestService")}:
            </span>{" "}
            {t("public.demoAvailable")}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="flex-1 text-sm text-slate-700">
            {t("public.demoCustomerConversionPrompt")}
          </p>
          <Link
            href="/signup?source=demo-customer"
            className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {t("public.demoCtaLaunchPortal")}
          </Link>
        </div>

        <div className="mt-5 grid gap-2 md:grid-cols-3">
          {proofList.map((point) => (
            <p
              key={point}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
            >
              {point}
            </p>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            {t("public.demoOpenAndPaidInvoices")}
          </h2>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">{t("public.invoice")}</p>
            <p className="text-lg font-semibold text-slate-900">
              {demoInvoice.number}
            </p>
            <p className="mt-2 text-sm text-slate-700">
              {t("public.demoLabelService")} {t(demoInvoice.serviceKey)}
            </p>
            <p className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
              {language === "en"
                ? "In production, customers pay through secure hosted checkout and receipts are logged automatically."
                : "En produccion, clientes pagan por checkout seguro y recibos quedan registrados automaticamente."}
            </p>
            <p className="text-sm text-slate-700">
              {t("public.amount")}: {formatCurrency(demoInvoice.amount, locale)}
            </p>
            <p className="text-sm text-slate-700">
              {t("public.demoLabelDueDate")}{" "}
              {formatDate(demoInvoice.dueDateIso, locale)}
            </p>
            <p className="demo-badge-pulse mt-2 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              {t("public.demoLabelStatus")} {invoiceStatus}
            </p>

            {!data.invoicePaid ? (
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(true)}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {t("public.demoPayInvoice")}
              </button>
            ) : (
              <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                {t("public.demoPaymentSuccessful")}
              </p>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">
              {t("public.demoPaymentSafetyTitle")}
            </p>
            <p className="mt-1">{t("public.demoPaymentSafetyCopy")}</p>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            {t("public.demoServiceHistoryAndChecklist")}
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {serviceHistory.length > 0 ? (
              serviceHistory.map((itemKey) => (
                <li
                  key={itemKey}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  {t(itemKey)}
                </li>
              ))
            ) : (
              <li className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-slate-500">
                {t("public.demoNoAfterPhotos")}
              </li>
            )}
          </ul>

          <h3 className="mt-5 text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">
            {t("public.demoCompletionChecklist")}
          </h3>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {completionChecklist.length > 0 ? (
              completionChecklist.map((itemKey) => (
                <li
                  key={itemKey}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  {t(itemKey)}
                </li>
              ))
            ) : (
              <li className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-slate-500">
                {t("public.demoNoAfterPhotos")}
              </li>
            )}
          </ul>

          <button
            type="button"
            onClick={() => setServiceRequestSubmitted(true)}
            className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700"
          >
            {t("public.demoRequestService")}
          </button>
          {serviceRequestSubmitted ? (
            <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
              {language === "en"
                ? "Demo request submitted. In production this creates a service ticket for your operations team."
                : "Solicitud demo enviada. En produccion esto crea un ticket para tu equipo de operaciones."}
            </p>
          ) : null}
        </article>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">
          {t("public.demoBeforeAfterPhotos")}
        </h2>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-slate-700">
              {t("public.demoBefore")}
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {demoBeforePhotos.map((url) => (
                /* biome-ignore lint/performance/noImgElement: Demo fixtures use external image URLs. */
                <img
                  key={url}
                  src={url}
                  alt={t("public.demoImageAltBeforeCondition")}
                  className="h-32 w-full rounded-xl object-cover ring-1 ring-slate-200"
                />
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">
              {t("public.demoAfter")}
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {(data.selectedAfterPhotos.length > 0
                ? data.selectedAfterPhotos
                : demoAfterPhotos
              ).map((url) => (
                /* biome-ignore lint/performance/noImgElement: Demo fixtures use external image URLs. */
                <img
                  key={url}
                  src={url}
                  alt={t("public.demoImageAltAfterCondition")}
                  className="h-32 w-full rounded-xl object-cover ring-1 ring-slate-200"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {isCheckoutOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              {t("public.demoSimulatedCheckout")}
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">
              {t("public.demoPayInvoiceWithNumber", {
                invoiceNumber: demoInvoice.number,
              })}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              {t("public.demoSimulatedCheckoutCopy")}
            </p>
            <p className="mt-4 text-lg font-semibold text-slate-900">
              {t("public.demoLabelTotal")}{" "}
              {formatCurrency(demoInvoice.amount, locale)}
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  updateSession({ invoicePaid: true });
                  setIsCheckoutOpen(false);
                }}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {t("public.demoCompleteDemoPayment")}
              </button>
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
              >
                {t("public.demoCancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
