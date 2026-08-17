import { getDictionary, type Locale, locales, defaultLocale } from "@/i18n";
import { escapeHtml } from "@/lib/email-template";
import { siteInfo } from "@/config/site-config";

export interface QuoteNotificationContent {
  title: string;
  content: string;
  emailHtml: string;
}

export function createQuoteNotificationContent({
  status,
  amountLabel,
  reference,
  locale,
}: {
  status: string;
  amountLabel?: string;
  reference: string;
  locale?: string;
}): QuoteNotificationContent {
  const validLocale: Locale = locales.includes(locale as Locale)
    ? locale as Locale
    : defaultLocale;
  const dictionary = getDictionary(validLocale);
  const translations = dictionary.notifications;
  const statusLabels = translations.statusLabels as Record<string, string>;
  const statusLabel = statusLabels[status] || status;

  let title = translations.quoteStatusUpdated;
  let content = translations.quoteStatusUpdatedContent.replace("{status}", statusLabel);

  if (status === "QUOTED") {
    title = translations.yourQuoteHasBeenQuoted;
    content = translations.quoteAmountProvided.replace("{price}", amountLabel || statusLabel);
  } else if (status === "ACCEPTED") {
    title = translations.quoteAccepted;
    content = translations.quoteAcceptedContent;
  } else if (status === "REJECTED") {
    title = translations.quoteRejected;
    content = translations.quoteRejectedContent;
  }

  const emailHtml = [
    `<p><strong>${escapeHtml(siteInfo.shortName)}</strong></p>`,
    `<h1>${escapeHtml(title)}</h1>`,
    `<p>${escapeHtml(content)}</p>`,
    `<p><strong>${escapeHtml(reference)}</strong></p>`,
  ].join("\n");

  return { title, content, emailHtml };
}
