"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { DemoAccountBadge } from "@/components/demo/demo-account-badge";
import { useDemoSession } from "@/components/demo/demo-session-provider";
import { useI18n } from "@/components/i18n-provider";
import { demoTourSteps } from "@/lib/demo-fixtures";

const tourOutcomes = {
  en: [
    "Quote requests move to scheduled jobs without spreadsheet handoffs",
    "Field completion updates owners and customers with proof automatically",
    "Invoices are generated with context so your team collects faster",
  ],
  es: [
    "Solicitudes de cotizacion pasan a trabajos programados sin hojas manuales",
    "Cierre en campo actualiza a propietarios y clientes con evidencia automaticamente",
    "Facturas salen con contexto para acelerar cobro de tu equipo",
  ],
};

export function DemoTourPage() {
  const { t, locale } = useI18n();
  const language = locale === "es" ? "es" : "en";
  const { data, updateSession, resetDemo } = useDemoSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [showEstimateSuccess, setShowEstimateSuccess] = useState(false);
  const [showScheduleSuccess, setShowScheduleSuccess] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const pendingTimers = useRef<number[]>([]);

  const clearPendingTimers = useCallback(() => {
    for (const id of pendingTimers.current) {
      window.clearTimeout(id);
    }
    pendingTimers.current = [];
  }, []);

  const resetTourState = useCallback(() => {
    clearPendingTimers();
    resetDemo();
    setCurrentStep(0);
    setShowEstimateSuccess(false);
    setShowScheduleSuccess(false);
    setShowPaymentSuccess(false);
  }, [clearPendingTimers, resetDemo]);

  const step = demoTourSteps[currentStep];
  const isLastStep = currentStep === demoTourSteps.length - 1;
  const outcomes = tourOutcomes[language];

  const nextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, demoTourSteps.length - 1));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <DemoAccountBadge />
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            {t("public.demoGuidedTour")}
          </span>
        </div>

        <h1 className="mt-4 text-3xl font-semibold text-slate-950 sm:text-4xl">
          {t("public.demoGuidedTourTitle")}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {t("public.demoGuidedTourSubtitle")}
        </p>
        <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
          {t("public.demoTourSafetyNotice")}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/signup?source=demo-tour"
            className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            {t("public.demoCtaStartFounderWorkspace")}
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:border-blue-300 hover:text-blue-700"
          >
            {t("public.demoCtaBookOnboardingCall")}
          </Link>
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">
            {language === "en"
              ? "What owners usually unlock first"
              : "Lo primero que suelen desbloquear los propietarios"}
          </p>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            {outcomes.map((item) => (
              <p
                key={item}
                className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                {item}
              </p>
            ))}
          </div>
        </div>

        <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-700 to-cyan-500 transition-all"
            style={{
              width: `${((currentStep + 1) / demoTourSteps.length) * 100}%`,
            }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {demoTourSteps.map((stepItem, index) => {
            const isReached = index <= currentStep;
            return (
              <span
                key={stepItem.titleKey}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] ${
                  isReached
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {index + 1}
              </span>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div
          data-testid="demo-tour-step"
          data-step={String(currentStep + 1)}
          className="sr-only"
          aria-hidden="true"
        />
        <h2 className="text-2xl font-semibold text-slate-900">
          {t(step.titleKey)}
        </h2>
        <p className="mt-3 text-base leading-7 text-slate-600">
          {t(step.bodyKey)}
        </p>
        <p className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900">
          {t("public.demoTourInstructionPrefix")} {t(step.instructionKey)}
        </p>

        {currentStep === 2 ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <button
              type="button"
              onClick={() => {
                updateSession({
                  quoteApproved: true,
                });
                setShowEstimateSuccess(true);
              }}
              className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white ring-4 ring-blue-100 transition hover:bg-slate-800"
            >
              {t("public.demoApproveEstimate")}
            </button>
            {showEstimateSuccess || data.quoteApproved ? (
              <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                {t("public.demoEstimateApprovedSuccess")}
              </p>
            ) : null}
          </div>
        ) : null}

        {currentStep === 3 ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <button
              type="button"
              onClick={() => {
                updateSession({
                  jobScheduled: true,
                });
                setShowScheduleSuccess(true);
              }}
              className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white ring-4 ring-blue-100 transition hover:bg-slate-800"
            >
              {t("public.demoConfirmSchedule")}
            </button>
            {showScheduleSuccess || data.jobScheduled ? (
              <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                {t("public.demoScheduleConfirmedSuccess")}
              </p>
            ) : null}
          </div>
        ) : null}

        {currentStep === 4 ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <button
              type="button"
              onClick={() =>
                updateSession({
                  employeeClockedIn: true,
                  employeeJobStarted: true,
                  employeeJobCompleted: true,
                })
              }
              className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white ring-4 ring-blue-100 transition hover:bg-slate-800"
            >
              {t("public.demoSimulateJobCompletion")}
            </button>
            {data.employeeJobCompleted ? (
              <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                {t("public.demoJobCompletedSuccess")}
              </p>
            ) : null}
          </div>
        ) : null}

        {currentStep === 6 ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <button
              type="button"
              onClick={() => {
                updateSession({ invoicePaid: true });
                setShowPaymentSuccess(true);
              }}
              className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white ring-4 ring-blue-100 transition hover:bg-slate-800"
            >
              {t("public.demoPayInvoiceDemo")}
            </button>
            {showPaymentSuccess || data.invoicePaid ? (
              <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                {t("public.demoPaymentSuccessful")}
              </p>
            ) : null}
          </div>
        ) : null}

        {currentStep === 7 ? (
          <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
            <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              {data.quoteApproved
                ? t("public.demoDashboardQuoteStatusUpdated")
                : t("public.demoDashboardQuoteStatusPending")}
            </p>
            <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              {data.employeeJobCompleted
                ? t("public.demoDashboardJobStatusUpdated")
                : t("public.demoDashboardJobStatusPending")}
            </p>
            <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              {data.invoicePaid
                ? t("public.demoDashboardInvoiceStatusUpdated")
                : t("public.demoDashboardInvoiceStatusPending")}
            </p>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-50"
          >
            {t("public.demoBack")}
          </button>
          <button
            type="button"
            onClick={nextStep}
            disabled={isLastStep}
            className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t("public.demoNext")}
          </button>
          <Link
            href="/demo"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
          >
            {t("public.demoExitTour")}
          </Link>
          <button
            type="button"
            data-testid="demo-reset"
            onClick={resetTourState}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
          >
            {t("public.demoResetDemo")}
          </button>
        </div>
      </section>

      {isLastStep ? (
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-emerald-900">
            {t("public.demoTourCompletionMessage")}
          </h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/signup?source=demo-tour-complete"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              {t("public.startFreeTrial")}
            </Link>
            <Link
              href="/pricing#founding-partners"
              className="inline-flex items-center justify-center rounded-xl border border-emerald-300 bg-white px-5 py-3 text-sm font-semibold text-emerald-800"
            >
              {t("public.demoCtaFounderPricing")}
            </Link>
          </div>
          <p className="mt-3 text-sm text-emerald-900/90">
            {language === "en"
              ? "No credit card required to secure your Founder Partner onboarding slot."
              : "No se requiere tarjeta para asegurar tu cupo de onboarding Founder Partner."}
          </p>
        </section>
      ) : null}
    </div>
  );
}
