"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Locale, defaultLocale, getDictionary, locales } from "@/i18n";

type Dictionary = ReturnType<typeof getDictionary>;

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
  mounted: boolean;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const LOCALE_STORAGE_KEY = "site-locale";

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [dictionary, setDictionary] = useState<Dictionary>(getDictionary(defaultLocale));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 标记客户端已加载
    setMounted(true);
    // 从 localStorage 读取语言设置
    try {
      const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
      if (savedLocale && locales.includes(savedLocale)) {
        setLocaleState(savedLocale);
        setDictionary(getDictionary(savedLocale));
      }
    } catch (e) {
      // localStorage 可能在某些环境下不可用
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    setDictionary(getDictionary(newLocale));
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
      // 更新 html lang 属性
      document.documentElement.lang = newLocale === "zh" ? "zh-CN" : newLocale;
    } catch (e) {
      // localStorage 可能在某些环境下不可用
    }
  };

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
