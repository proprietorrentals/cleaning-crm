import { en } from "@/lib/i18n/locales/en";
import { es } from "@/lib/i18n/locales/es";
import type { Dictionary, DictionaryValue, Language } from "@/lib/i18n/types";
import { DEFAULT_LANGUAGE } from "@/lib/i18n/types";

export const dictionaries: Record<Language, Dictionary> = {
  en,
  es,
};

function resolvePath(dictionary: Dictionary, key: string): string | null {
  const parts = key.split(".");
  let current: DictionaryValue | undefined = dictionary;

  for (const part of parts) {
    if (!current || typeof current === "string") {
      return null;
    }
    current = current[part];
  }

  if (typeof current === "string") {
    return current;
  }

  return null;
}

export function translate(language: Language, key: string, vars?: Record<string, string | number>) {
  const selected = resolvePath(dictionaries[language], key);
  const fallback = resolvePath(dictionaries[DEFAULT_LANGUAGE], key);
  const template = selected ?? fallback ?? key;

  if (!vars) return template;

  return Object.entries(vars).reduce((text, [name, value]) => {
    return text.replace(new RegExp(`{{\\s*${name}\\s*}}`, "g"), String(value));
  }, template);
}
