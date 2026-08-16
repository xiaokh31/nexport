"use client";

import { Mail, MapPin, Phone, Check, ArrowDown, type LucideIcon } from "lucide-react";
import { QuoteForm } from "@/components/forms";
import { getPublicPageCopy } from "@/config/public-page-content";
import { siteLinks } from "@/config/site-config";
import { useLocale } from "@/i18n/locale-context";
import { isPlaceholderIdentityValue } from "@/lib/seo/structured-data";

export default function ContactPage() {
  const { locale, t } = useLocale();
  const copy = getPublicPageCopy(locale).contact;
  const contactInfo: Array<{
    icon: LucideIcon;
    title: string;
    content: string;
    href: string;
    external?: boolean;
  }> = [
    {
      icon: Mail,
      title: t.contact.email,
      content: siteLinks.email,
      href: `mailto:${siteLinks.email}`,
    },
    {
      icon: Phone,
      title: t.contact.phone,
      content: siteLinks.phone,
      href: `tel:${siteLinks.phone}`,
    },
    {
      icon: MapPin,
      title: t.contact.address,
      content: siteLinks.address,
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(siteLinks.address)}`,
      external: true,
    },
  ].filter((item) => !isPlaceholderIdentityValue(item.content));

  return (
    <>
      <section className="border-b-4 border-signal-amber bg-dock-navy py-16 text-paper-white md:py-24">
        <div className="container grid gap-8 lg:grid-cols-[0.65fr_1.35fr] lg:items-end">
          <p className="font-utility text-xs font-semibold uppercase tracking-[0.18em] text-signal-amber">
            {copy.eyebrow}
          </p>
          <div>
            <h1 className="max-w-5xl font-display text-5xl font-bold text-paper-white md:text-6xl">
              {copy.title}
            </h1>
            <p className="mt-5 max-w-3xl leading-8 text-paper-white/75">{copy.description}</p>
          </div>
        </div>
      </section>

      <section className="bg-paper-white py-14 md:py-20">
        <div className="container grid min-w-0 gap-12 lg:grid-cols-[0.62fr_1.38fr] lg:gap-16">
          <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start" aria-label={copy.prepareTitle}>
            <section className="border-t-2 border-dock-navy py-6">
              <h2 className="font-display text-3xl font-bold">{copy.prepareTitle}</h2>
              <ul className="mt-6 space-y-4">
                {copy.prepareItems.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-7">
                    <Check className="mt-1 size-4 shrink-0 text-steel-blue" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="border-t border-border py-6">
              <h2 className="text-lg font-semibold">{copy.nextTitle}</h2>
              <div className="mt-5 space-y-5">
                {copy.nextItems.map((item, index) => (
                  <article key={item.title} className="grid grid-cols-[1.5rem_1fr] gap-3">
                    <ArrowDown className="mt-1 size-4 text-signal-amber" aria-hidden="true" />
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                      {index < copy.nextItems.length - 1 && <span className="mt-4 block h-5 border-l border-border" aria-hidden="true" />}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {contactInfo.length > 0 && (
              <section className="border-t border-border py-6">
                <h2 className="text-lg font-semibold">{copy.directTitle}</h2>
                <address className="mt-4 grid gap-2 not-italic">
                  {contactInfo.map((item) => {
                    const Icon = item.icon;
                    return (
                      <a
                        key={item.title}
                        href={item.href}
                        target={item.external ? "_blank" : undefined}
                        rel={item.external ? "noopener noreferrer" : undefined}
                        className="flex min-h-11 min-w-0 items-start gap-3 py-2 text-sm hover:underline"
                      >
                        <Icon className="mt-0.5 size-4 shrink-0 text-steel-blue" aria-hidden="true" />
                        <span className="min-w-0 break-words">
                          <span className="sr-only">{item.title}: </span>
                          {item.content}
                        </span>
                      </a>
                    );
                  })}
                </address>
              </section>
            )}
          </aside>

          <div className="min-w-0 border-t-4 border-signal-amber bg-concrete p-4 sm:p-7 md:p-9">
            <div className="border-b-2 border-dock-navy pb-6">
              <h2 className="font-display text-3xl font-bold md:text-4xl">{copy.formTitle}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{copy.formDescription}</p>
            </div>
            <QuoteForm />
          </div>
        </div>
      </section>
    </>
  );
}
