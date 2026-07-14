"use client";

import Link from "next/link";
import { useMemo } from "react";
import { DemoAccountBadge } from "@/components/demo/demo-account-badge";
import { useDemoSession } from "@/components/demo/demo-session-provider";
import { useI18n } from "@/components/i18n-provider";
import {
  demoBeforePhotos,
  demoChecklist,
  demoEmployee,
  demoPrimaryJob,
} from "@/lib/demo-fixtures";

const adoptionPoints = {
  en: [
    "Bilingual checklist flow reduces training time for new hires",
    "Proof photos and notes are captured once and reused in customer updates",
    "Office sees completion in real time, so fewer follow-up calls hit your team",
  ],
  es: [
    "Checklist bilingue reduce el tiempo de entrenamiento para nuevos ingresos",
    "Fotos y notas se capturan una vez y se reutilizan en comunicacion al cliente",
    "La oficina ve cierre en tiempo real y baja llamadas de seguimiento al equipo",
  ],
};

export function DemoEmployeePage() {
  const { t, locale } = useI18n();
  const language = locale === "es" ? "es" : "en";
  const {
    data,
    updateSession,
    updateChecklist,
    addUploadedAfterPhoto,
    useSimulatedAfterPhotos,
  } = useDemoSession();

  const completedCount = useMemo(
    () => Object.values(data.checklist).filter(Boolean).length,
    [data.checklist],
  );
  const totalCount = demoChecklist.length;

  const allAfterPhotos = [
    ...data.selectedAfterPhotos,
    ...data.uploadedAfterPhotos,
  ];

  const completionReady =
    data.employeeClockedIn &&
    data.employeeJobStarted &&
    completedCount === totalCount &&
    allAfterPhotos.length > 0 &&
    data.jobNote.trim().length > 0;

  const checklistPercent = Math.round((completedCount / totalCount) * 100);
  const points = adoptionPoints[language];

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <DemoAccountBadge />
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            {t("public.demoPortalEmployeeTitle")}
          </span>
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-slate-950 sm:text-4xl">
          {demoEmployee.name} - {t("public.demoEmployeePortal")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {t("public.demoPortalEmployeeDescription")}
        </p>

        <div className="mt-5 grid gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950 sm:grid-cols-2 lg:grid-cols-4">
          <p>
            <span className="font-semibold">{t("public.demoLabelRole")}:</span>{" "}
            {t(demoEmployee.roleKey)}
          </p>
          <p>
            <span className="font-semibold">
              {t("public.demoLabelJobsToday")}:
            </span>{" "}
            {demoEmployee.jobsToday}
          </p>
          <p>
            <span className="font-semibold">
              {t("public.demoLabelHoursThisWeek")}:
            </span>{" "}
            {demoEmployee.hoursThisWeek}
          </p>
          <p>
            <span className="font-semibold">
              {t("public.demoLabelCompletionScore")}:
            </span>{" "}
            {demoEmployee.completionScore}%
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="flex-1 text-sm text-slate-700">
            {t("public.demoEmployeeConversionPrompt")}
          </p>
          <Link
            href="/signup?source=demo-employee"
            className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
          >
            {t("public.demoCtaGetTeamOnboarded")}
          </Link>
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">
            {language === "en"
              ? "Crew adoption proof"
              : "Prueba de adopcion del equipo"}
          </p>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            {points.map((point) => (
              <p
                key={point}
                className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                {point}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">
          {t("public.demoTodaysPrimaryJob")}
        </h2>
        <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-2">
          <p>
            <span className="font-semibold">
              {t("public.demoLabelCustomer")}:
            </span>{" "}
            {demoPrimaryJob.customer}
          </p>
          <p>
            <span className="font-semibold">{t("public.demoLabelTime")}:</span>{" "}
            {demoPrimaryJob.time}
          </p>
          <p>
            <span className="font-semibold">
              {t("public.demoLabelLocation")}:
            </span>{" "}
            {demoPrimaryJob.location}
          </p>
          <p>
            <span className="font-semibold">{t("public.demoLabelTeam")}:</span>{" "}
            {demoPrimaryJob.teamMembers.join(` ${t("public.demoListAnd")} `)}
          </p>
        </div>
        <p className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          {t("public.demoLabelStatus")}{" "}
          {data.employeeJobCompleted
            ? t("public.demoStatusCompleted")
            : data.employeeJobStarted
              ? t("public.demoStatusInProgress")
              : t("public.demoStatusReadyToStart")}
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            {t("public.demoInteractiveJobSteps")}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => updateSession({ employeeClockedIn: true })}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                data.employeeClockedIn
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-slate-300 bg-white text-slate-800"
              }`}
            >
              {t("public.demoStepClockIn")}
            </button>
            <button
              type="button"
              onClick={() =>
                updateSession({
                  employeeJobStarted: true,
                  employeeClockedIn: true,
                })
              }
              className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                data.employeeJobStarted
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-slate-300 bg-white text-slate-800"
              }`}
            >
              {t("public.demoStepStartJob")}
            </button>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">
              {t("public.demoStepCompleteChecklist")}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {t("public.demoChecklistProgress", {
                completed: completedCount,
                total: totalCount,
              })}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-600 to-blue-700 transition-all duration-300"
                style={{ width: `${checklistPercent}%` }}
              />
            </div>
            <div className="mt-3 space-y-2">
              {demoChecklist.map((item) => (
                <label
                  key={item.id}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(data.checklist[item.id])}
                    onChange={(event) =>
                      updateChecklist(item.id, event.target.checked)
                    }
                    className="mt-0.5 h-4 w-4 accent-blue-700"
                  />
                  <span>{t(item.labelKey)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">
              {t("public.demoStepMarkComplete")}
            </h3>
            <button
              type="button"
              disabled={!completionReady}
              onClick={() => updateSession({ employeeJobCompleted: true })}
              className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {t("public.demoMarkJobComplete")}
            </button>
            <button
              type="button"
              disabled={!data.employeeJobCompleted}
              onClick={() => updateSession({ employeeClockedOut: true })}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("public.demoStepClockOut")}
            </button>
            {data.employeeJobCompleted ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                {t("public.demoJobCompletedSuccess")}
              </p>
            ) : null}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            {t("public.demoPhotosAndJobNote")}
          </h2>

          <div className="mt-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">
              {t("public.demoStepBeforePhotos")}
            </h3>
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

          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">
              {t("public.demoStepAfterPhotos")}
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={useSimulatedAfterPhotos}
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"
              >
                {t("public.demoSelectSimulatedAfterPhotos")}
              </button>
              <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800">
                {t("public.demoUploadPhoto")}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }
                    const objectUrl = URL.createObjectURL(file);
                    addUploadedAfterPhoto(objectUrl);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            {allAfterPhotos.length > 0 ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {allAfterPhotos.map((url) => (
                  /* biome-ignore lint/performance/noImgElement: Demo supports blob URLs for local uploaded files. */
                  <img
                    key={url}
                    src={url}
                    alt={t("public.demoImageAltAfterCondition")}
                    className="h-32 w-full rounded-xl object-cover ring-1 ring-slate-200"
                  />
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                {t("public.demoNoAfterPhotos")}
              </p>
            )}
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">
              {t("public.demoStepAddJobNote")}
            </h3>
            <textarea
              value={data.jobNote}
              onChange={(event) =>
                updateSession({ jobNote: event.target.value })
              }
              placeholder={t("public.demoJobNotePlaceholder")}
              rows={4}
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800"
            />
          </div>
        </article>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex-1 text-sm text-slate-700">
            {language === "en"
              ? "If your team can complete this flow in demo, they can run it in production on day one."
              : "Si tu equipo completa este flujo en demo, puede operarlo en produccion desde el dia uno."}
          </p>
          <Link
            href="/signup?source=demo-employee-footer"
            className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {t("public.demoCtaGetTeamOnboarded")}
          </Link>
        </div>
      </section>
    </div>
  );
}
