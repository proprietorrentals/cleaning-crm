"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, type Language } from "@/lib/i18n/types";
import { translate } from "@/lib/i18n";

type I18nContextValue = {
  language: Language;
  locale: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
  setLanguage: (language: Language) => Promise<void>;
  isReady: boolean;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "serviceos.language";
const COOKIE_KEY = "serviceos_lang";

function isLanguage(value: string | null | undefined): value is Language {
  return Boolean(value && (SUPPORTED_LANGUAGES as readonly string[]).includes(value));
}

function localeFromLanguage(language: Language) {
  return language === "es" ? "es-ES" : "en-US";
}

function readCookieLanguage() {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split(";").map((part) => part.trim());
  const match = cookies.find((entry) => entry.startsWith(`${COOKIE_KEY}=`));
  if (!match) return null;
  const value = decodeURIComponent(match.slice(COOKIE_KEY.length + 1));
  return isLanguage(value) ? value : null;
}

function writeLanguageCookie(language: Language) {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(language)}; path=/; max-age=31536000; samesite=lax`;
}

function readLocalLanguage() {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  return isLanguage(value) ? value : null;
}

function writeLocalLanguage(language: Language) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, language);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      const preferredFromStorage = readLocalLanguage() ?? readCookieLanguage();

      if (preferredFromStorage && isMounted) {
        setLanguageState(preferredFromStorage);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const authPreference = session?.user?.user_metadata?.preferred_language;

      // Storage is the client source of truth. Keep profile in sync with it.
      if (preferredFromStorage && session?.user) {
        if (authPreference !== preferredFromStorage) {
          await supabase.auth.updateUser({
            data: {
              ...session.user.user_metadata,
              preferred_language: preferredFromStorage,
            },
          });
        }
      } else if (isLanguage(authPreference) && isMounted) {
        setLanguageState(authPreference);
        writeLocalLanguage(authPreference);
        writeLanguageCookie(authPreference);
      }

      if (isMounted) {
        setIsReady(true);
      }
    };

    void initialize();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const preferredFromStorage = readLocalLanguage() ?? readCookieLanguage();
      const authPreference = session?.user?.user_metadata?.preferred_language;

      if (preferredFromStorage) {
        setLanguageState(preferredFromStorage);
        if (session?.user && authPreference !== preferredFromStorage) {
          void supabase.auth.updateUser({
            data: {
              ...session.user.user_metadata,
              preferred_language: preferredFromStorage,
            },
          });
        }
      } else if (isLanguage(authPreference)) {
        setLanguageState(authPreference);
        writeLocalLanguage(authPreference);
        writeLanguageCookie(authPreference);
      }
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  const setLanguage = useCallback(
    async (nextLanguage: Language) => {
      setLanguageState(nextLanguage);
      writeLocalLanguage(nextLanguage);
      writeLanguageCookie(nextLanguage);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        await supabase.auth.updateUser({
          data: {
            ...session.user.user_metadata,
            preferred_language: nextLanguage,
          },
        });
      }
    },
    [supabase],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      locale: localeFromLanguage(language),
      isReady,
      setLanguage,
      t: (key, vars) => translate(language, key, vars),
    }),
    [isReady, language, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
