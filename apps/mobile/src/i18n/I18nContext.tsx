import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

import en from "../locales/en.json";
import ja from "../locales/ja.json";
import { usePreferences } from "../features/preferences/context";

type Locale = "en" | "ja";
type Values = Record<string, string | number>;
type Dictionary = Record<string, unknown>;

const dictionaries: Record<Locale, Dictionary> = { en, ja };

function lookup(dictionary: Dictionary, key: string): string | undefined {
  let current: unknown = dictionary;
  for (const part of key.split(".")) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Dictionary)[part];
  }
  return typeof current === "string" ? current : undefined;
}

function interpolate(message: string, values?: Values): string {
  if (!values) return message;
  return message.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    values[key] === undefined ? match : String(values[key]),
  );
}

type I18nValue = {
  locale: Locale;
  t: (key: string, values?: Values) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { ui_language: locale } = usePreferences();
  const t = useCallback((key: string, values?: Values) => {
    const localized = lookup(dictionaries[locale], key);
    const fallback = lookup(dictionaries.en, key);
    return interpolate(localized ?? fallback ?? key, values);
  }, [locale]);
  const value = useMemo(() => ({ locale, t }), [locale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useTranslation must be used inside I18nProvider");
  return value;
}
