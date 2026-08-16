"use client";

import { Check, CornerDownRight } from "lucide-react";
import { getMarketingCopy } from "@/config/marketing-content";
import { useLocale } from "@/i18n/locale-context";

export function CapabilitiesSection() {
  const { locale } = useLocale();
  const copy = getMarketingCopy(locale);

  return (
    <section className="bg-concrete py-16 md:py-24" aria-labelledby="capabilities-title">
      <div className="container grid gap-12 lg:grid-cols-2 lg:gap-20">
        <div>
          <p className="font-utility text-xs font-semibold uppercase tracking-[0.18em] text-steel-blue">
            {copy.capabilities.eyebrow}
          </p>
          <h2 id="capabilities-title" className="mt-5 font-display text-4xl font-bold md:text-5xl">
            {copy.capabilities.title}
          </h2>
          <p className="mt-5 max-w-xl leading-7 text-muted-foreground">{copy.capabilities.description}</p>
          <ul className="mt-8 border-y-2 border-dock-navy">
            {copy.capabilities.items.map((item) => (
              <li key={item} className="flex gap-3 border-b border-border py-4 last:border-b-0">
                <Check className="mt-0.5 size-5 shrink-0 text-steel-blue" aria-hidden="true" />
                <span className="font-medium">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-l-4 border-signal-amber bg-paper-white p-6 md:p-9">
          <p className="font-utility text-xs font-semibold uppercase tracking-[0.18em] text-steel-blue">
            {copy.audience.eyebrow}
          </p>
          <h2 className="mt-5 font-display text-3xl font-bold md:text-4xl">{copy.audience.title}</h2>
          <div className="mt-7 divide-y divide-border border-y border-border">
            {copy.audience.items.map((item) => (
              <article key={item.title} className="grid gap-3 py-5 sm:grid-cols-[1fr_2fr]">
                <h3 className="flex gap-2 font-semibold">
                  <CornerDownRight className="mt-0.5 size-4 shrink-0 text-signal-amber" aria-hidden="true" />
                  {item.title}
                </h3>
                <p className="text-sm leading-7 text-muted-foreground">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
