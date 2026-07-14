"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import type { Language } from "@/lib/i18n/types";

export function LanguageSelector() {
  const { language, setLanguage, t } = useI18n();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const label = useMemo(() => {
    return language === "es" ? t("common.spanish") : t("common.english");
  }, [language, t]);

  const handleChange = async (nextLanguage: Language) => {
    if (nextLanguage === language) return;
    setSaving(true);
    await setLanguage(nextLanguage);
    router.refresh();
    setSaving(false);
  };

  return (
    <div className="fixed bottom-3 right-3 z-[90] sm:bottom-4 sm:right-4">
      <div className="rounded-xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 sm:text-sm"
          aria-expanded={open}
          aria-label={t("common.language")}
        >
          <span>{t("common.language")}</span>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] sm:text-xs">
            {label}
          </span>
        </button>

        {open ? (
          <div className="mt-2 min-w-[180px]">
            <select
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 sm:text-sm"
              value={language}
              disabled={saving}
              onChange={(event) => {
                void handleChange(event.target.value as Language);
              }}
            >
              <option value="en">{t("common.english")}</option>
              <option value="es">{t("common.spanish")}</option>
            </select>
          </div>
        ) : null}
      </div>
    </div>
  );
}
