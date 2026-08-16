"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import type { ServiceType } from "@/config/quote";
import { Button } from "@/components/ui/button";
import { getMarketingCopy } from "@/config/marketing-content";
import { useLocale } from "@/i18n/locale-context";

export function CTASection({ serviceType }: { serviceType?: Exclude<ServiceType, "OTHER"> }) {
  const { locale } = useLocale();
  const copy = getMarketingCopy(locale).cta;
  const href = serviceType ? `/contact?service=${serviceType}` : "/contact";

  return (
    <section className="border-b-4 border-signal-amber bg-dock-navy py-16 text-paper-white md:py-24">
      <div className="container grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <p className="font-utility text-xs font-semibold uppercase tracking-[0.18em] text-signal-amber">
            {copy.eyebrow}
          </p>
          <h2 className="mt-5 max-w-3xl font-display text-4xl font-bold text-paper-white md:text-5xl">
            {copy.title}
          </h2>
          <p className="mt-4 text-paper-white/75">{copy.description}</p>
        </div>
        <div>
          <ul className="mb-7 grid gap-3 border-y border-paper-white/25 py-5 text-sm text-paper-white/85 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {copy.items.map((item) => (
              <li key={item} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-signal-amber" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <Button size="lg" asChild className="w-full bg-signal-amber text-dock-navy hover:bg-paper-white sm:w-auto">
            <Link href={href}>
              {copy.action}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
