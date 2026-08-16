"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMarketingCopy, getOperationStages } from "@/config/marketing-content";
import { useLocale } from "@/i18n/locale-context";

export function HeroSection() {
  const { locale } = useLocale();
  const copy = getMarketingCopy(locale);
  const stages = getOperationStages(locale);

  return (
    <section className="relative isolate overflow-hidden border-b-4 border-signal-amber bg-dock-navy text-paper-white">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 hidden w-[44%] border-l border-paper-white/15 bg-[linear-gradient(90deg,transparent_49%,rgba(250,251,248,0.08)_50%,transparent_51%)] bg-[length:5rem_100%] lg:block"
      />
      <div className="container relative grid min-h-[42rem] items-stretch gap-12 py-16 md:py-24 lg:grid-cols-[minmax(0,1.05fr)_minmax(25rem,0.95fr)] lg:gap-16 lg:py-28">
        <div className="flex max-w-3xl flex-col justify-center">
          <p className="font-utility mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-signal-amber">
            {copy.hero.eyebrow}
          </p>
          <h1 className="font-display text-5xl font-bold text-paper-white sm:text-6xl lg:text-7xl xl:text-[5.5rem]">
            {copy.hero.title}
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-8 text-paper-white/[0.78] md:text-lg">
            {copy.hero.description}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild className="bg-signal-amber text-dock-navy hover:bg-paper-white">
              <Link href="/contact">
                {copy.hero.primaryAction}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-paper-white/60 bg-transparent text-paper-white hover:border-paper-white hover:bg-paper-white hover:text-dock-navy"
            >
              <Link href="/solutions">{copy.hero.secondaryAction}</Link>
            </Button>
          </div>
        </div>

        <div className="self-center border-2 border-paper-white/35 bg-dock-navy/80 p-3 sm:p-5" aria-label={copy.hero.visualLabel}>
          <div className="flex items-center justify-between border-b border-paper-white/25 pb-3">
            <span className="font-utility text-xs uppercase tracking-[0.16em] text-paper-white/70">
              {copy.hero.visualLabel}
            </span>
            <span className="size-2 bg-signal-amber" aria-hidden="true" />
          </div>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2">
            {stages.map((stage) => (
              <li key={stage.code} className="relative min-h-32 border border-paper-white/25 p-4">
                <span className="font-utility text-[0.65rem] font-semibold tracking-[0.12em] text-signal-amber">
                  {stage.code}
                </span>
                <p className="mt-7 font-display text-2xl font-bold text-paper-white">{stage.title}</p>
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 right-0 h-6 w-10 border-l border-t border-paper-white/25"
                />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
