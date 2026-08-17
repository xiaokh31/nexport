"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { type Locale, defaultLocale, getDictionary, locales } from "@/i18n";

type Dictionary = ReturnType<typeof getDictionary>;

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
  mounted: boolean;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const LOCALE_STORAGE_KEY = "site-locale";

function readStoredLocale(): Locale | null {
  try {
    const value = localStorage.getItem(LOCALE_STORAGE_KEY);
    return value && locales.includes(value as Locale) ? (value as Locale) : null;
  } catch (error) {
    console.warn("Unable to read the saved locale preference.", error);
    return null;
  }
}

function storeLocale(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch (error) {
    console.warn("Unable to save the locale preference.", error);
  }
}

function applyDocumentLanguage(locale: Locale) {
  document.documentElement.lang = locale === "zh" ? "zh-CN" : locale;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [dictionary, setDictionary] = useState<Dictionary>(getDictionary(defaultLocale));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMounted(true);
      const savedLocale = readStoredLocale();
      if (savedLocale) {
        setLocaleState(savedLocale);
        setDictionary(getDictionary(savedLocale));
        applyDocumentLanguage(savedLocale);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setDictionary(getDictionary(newLocale));
    applyDocumentLanguage(newLocale);
    storeLocale(newLocale);
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: dictionary, mounted }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}
