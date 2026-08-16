"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CTASection } from "@/components/marketing";
import {
  getMarketingCopy,
  getSolutionPurposeGroups,
  getSolutionUiContent,
} from "@/config/marketing-content";
import { solutionConfigs } from "@/config/site-config";
import { useLocale } from "@/i18n/locale-context";

export default function SolutionsPage() {
  const { locale } = useLocale();
  const copy = getMarketingCopy(locale);
  const groups = getSolutionPurposeGroups(locale);

  return (
    <>
      <section className="border-b-4 border-signal-amber bg-dock-navy py-16 text-paper-white md:py-24">
        <div className="container grid gap-7 lg:grid-cols-[0.6fr_1.4fr] lg:items-end">
          <p className="font-utility text-xs font-semibold uppercase tracking-[0.18em] text-signal-amber">
            INDEX / {copy.solutionIndex.eyebrow}
          </p>
          <div>
            <h1 className="max-w-5xl font-display text-5xl font-bold text-paper-white md:text-6xl">
              {copy.solutionIndex.title}
            </h1>
            <p className="mt-5 max-w-3xl leading-8 text-paper-white/75">{copy.solutionIndex.description}</p>
          </div>
        </div>
      </section>

      <div className="bg-paper-white">
        {groups.map((group) => (
          <section
            key={group.key}
            className="border-b-2 border-dock-navy py-14 md:py-20"
            aria-labelledby={`solutions-${group.key}`}
          >
            <div className="container grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
              <div>
                <p className="font-utility text-xs font-semibold tracking-[0.16em] text-steel-blue">
                  {group.marker}
                </p>
                <h2 id={`solutions-${group.key}`} className="mt-4 font-display text-4xl font-bold md:text-5xl">
                  {group.title}
                </h2>
                <p className="mt-4 max-w-md leading-7 text-muted-foreground">{group.description}</p>
                <div className="mt-8 border-l-4 border-signal-amber bg-concrete p-5">
                  <h3 className="font-utility text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-steel-blue">
                    {copy.detail.suitedFor}
                  </h3>
                  <ul className="mt-4 space-y-3 text-sm">
                    {group.suitedFor.map((item) => (
                      <li key={item} className="flex gap-2">
                        <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="border-t-2 border-dock-navy">
                {group.solutionKeys.map((key) => {
                  const config = solutionConfigs.find((item) => item.key === key);
                  if (!config) return null;
                  const content = getSolutionUiContent(locale, key);
                  return (
                    <article key={key} className="grid gap-6 border-b border-border py-8 md:grid-cols-[1fr_1.1fr]">
                      <div>
                        <h3 className="font-display text-3xl font-bold">
                          <Link href={`/solutions/${config.slug}`} className="underline-offset-4 hover:underline">
                            {content.title}
                          </Link>
                        </h3>
                        <p className="mt-4 text-sm leading-7 text-muted-foreground">{content.summary}</p>
                      </div>
                      <div className="flex flex-col">
                        <ul className="space-y-3 text-sm">
                          {content.capabilities.map((capability) => (
                            <li key={capability} className="flex gap-2">
                              <Check className="mt-0.5 size-4 shrink-0 text-steel-blue" aria-hidden="true" />
                              {capability}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-5 border-l-2 border-signal-amber pl-3 text-xs leading-6 text-muted-foreground">
                          {content.exclusion}
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                          <Button asChild>
                            <Link href={`/solutions/${config.slug}`}>
                              {copy.solutions.detailAction}
                              <ArrowRight aria-hidden="true" />
                            </Link>
                          </Button>
                          <Button variant="outline" asChild>
                            <Link href={`/contact?service=${config.serviceType}`}>
                              {copy.solutions.quoteAction}
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        ))}
      </div>

      <CTASection />
    </>
  );
}
