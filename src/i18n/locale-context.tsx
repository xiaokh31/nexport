"use client";

import { createContext, useCallback, useContext, useState, useEffect, type ReactNode } from "react";
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

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [dictionary, setDictionary] = useState<Dictionary>(getDictionary(defaultLocale));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedLocale = readStoredLocale();
    if (savedLocale) {
      setLocaleState(savedLocale);
      setDictionary(getDictionary(savedLocale));
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setDictionary(getDictionary(newLocale));
    document.documentElement.lang = newLocale === "zh" ? "zh-CN" : newLocale;
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
