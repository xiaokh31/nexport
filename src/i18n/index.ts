import zhLocale from "./locales/zh.json";
import enLocale from "./locales/en.json";
import frLocale from "./locales/fr.json";

export const locales = ["zh", "en", "fr"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "zh";

export const localeNames: Record<Locale, string> = {
  zh: "中文",
  en: "English",
  fr: "Français",
};

const dictionaries = {
  zh: zhLocale,
  en: enLocale,
  fr: frLocale,
};

export function getDictionary(locale: Locale) {
  return dictionaries[locale] || dictionaries[defaultLocale];
}

export function getLocaleFromPath(pathname: string): Locale {
  const segments = pathname.split("/");
  const localeSegment = segments[1] as Locale;
  return locales.includes(localeSegment) ? localeSegment : defaultLocale;
}
