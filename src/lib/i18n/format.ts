"use client";

import { useI18n } from "@/components/i18n-provider";

export function useLocaleFormat() {
  const { locale } = useI18n();

  return {
    locale,
    formatDate: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => {
      return new Intl.DateTimeFormat(locale, options).format(new Date(value));
    },
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => {
      return new Intl.NumberFormat(locale, options).format(value);
    },
    formatCurrency: (value: number, currency = "USD", options?: Intl.NumberFormatOptions) => {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
        ...options,
      }).format(value);
    },
  };
}
