export const SUPPORTED_LANGUAGES = ["en", "es"] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = "en";

export type DictionaryValue = string | { [key: string]: DictionaryValue };

export type Dictionary = { [key: string]: DictionaryValue };
