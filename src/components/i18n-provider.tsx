"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { translate } from "@/lib/i18n";
import {
  DEFAULT_LANGUAGE,
  type Language,
  SUPPORTED_LANGUAGES,
} from "@/lib/i18n/types";
import { createClient } from "@/lib/supabase/client";

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
  return Boolean(
    value && (SUPPORTED_LANGUAGES as readonly string[]).includes(value),
  );
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

function getPreferredLanguage(opts: {
  cookieLanguage: Language | null;
  localLanguage: Language | null;
  authLanguage: Language | null;
  initialLanguage: Language;
}) {
  if (opts.cookieLanguage) return opts.cookieLanguage;
  if (opts.localLanguage) return opts.localLanguage;
  if (opts.authLanguage) return opts.authLanguage;
  return opts.initialLanguage;
}

export function I18nProvider({
  children,
  initialLanguage = DEFAULT_LANGUAGE,
}: {
  children: React.ReactNode;
  initialLanguage?: Language;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const cookieLanguage = readCookieLanguage();
      const localLanguage = readLocalLanguage();
      const authPreference = session?.user?.user_metadata?.preferred_language;
      const authLanguage = isLanguage(authPreference) ? authPreference : null;
      const preferredLanguage = getPreferredLanguage({
        cookieLanguage,
        localLanguage,
        authLanguage,
        initialLanguage,
      });

      if (isMounted) {
        setLanguageState(preferredLanguage);
      }

      // Cookie is authoritative for SSR/client consistency. Keep local/auth in sync.
      writeLanguageCookie(preferredLanguage);
      writeLocalLanguage(preferredLanguage);

      if (session?.user && authPreference !== preferredLanguage) {
        await supabase.auth.updateUser({
          data: {
            ...session.user.user_metadata,
            preferred_language: preferredLanguage,
          },
        });
      }

      if (isMounted) {
        setIsReady(true);
      }
    };

    void initialize();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const cookieLanguage = readCookieLanguage();
        const localLanguage = readLocalLanguage();
        const authPreference = session?.user?.user_metadata?.preferred_language;
        const authLanguage = isLanguage(authPreference) ? authPreference : null;
        const preferredLanguage = getPreferredLanguage({
          cookieLanguage,
          localLanguage,
          authLanguage,
          initialLanguage,
        });

        setLanguageState(preferredLanguage);
        writeLanguageCookie(preferredLanguage);
        writeLocalLanguage(preferredLanguage);

        if (session?.user && authPreference !== preferredLanguage) {
          void supabase.auth.updateUser({
            data: {
              ...session.user.user_metadata,
              preferred_language: preferredLanguage,
            },
          });
        }
      },
    );

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [initialLanguage, supabase]);

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
