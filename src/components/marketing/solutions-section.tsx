"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getMarketingCopy,
  getSolutionPurposeGroups,
  getSolutionUiContent,
} from "@/config/marketing-content";
import { solutionConfigs } from "@/config/site-config";
import { useLocale } from "@/i18n/locale-context";

export function SolutionsSection() {
  const { locale } = useLocale();
  const copy = getMarketingCopy(locale);
  const groups = getSolutionPurposeGroups(locale);

  return (
    <section className="border-y bg-paper-white py-16 md:py-24" aria-labelledby="home-solutions-title">
      <div className="container">
        <div className="grid gap-6 border-b-2 border-dock-navy pb-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <p className="font-utility text-xs font-semibold uppercase tracking-[0.18em] text-steel-blue">
            {copy.solutions.eyebrow}
          </p>
          <div>
            <h2 id="home-solutions-title" className="font-display text-4xl font-bold md:text-5xl">
              {copy.solutions.title}
            </h2>
            <p className="mt-4 max-w-3xl text-muted-foreground">{copy.solutions.description}</p>
          </div>
        </div>

        <div className="divide-y-2 divide-dock-navy">
          {groups.map((group) => (
            <section key={group.key} className="grid gap-7 py-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-12">
              <div>
                <p className="font-utility text-[0.68rem] font-semibold tracking-[0.15em] text-steel-blue">
                  {group.marker}
                </p>
                <h3 className="mt-3 font-display text-3xl font-bold">{group.title}</h3>
                <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">{group.description}</p>
              </div>
              <div className="grid gap-px border bg-border md:grid-cols-2">
                {group.solutionKeys.map((key) => {
                  const config = solutionConfigs.find((item) => item.key === key);
                  if (!config) return null;
                  const content = getSolutionUiContent(locale, key);
                  return (
                    <article key={key} className="flex min-h-60 flex-col bg-background p-6">
                      <h4 className="text-lg font-semibold">
                        <Link className="underline-offset-4 hover:underline" href={`/solutions/${config.slug}`}>
                          {content.title}
                        </Link>
                      </h4>
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">{content.summary}</p>
                      <div className="mt-auto flex flex-wrap gap-x-5 gap-y-2 pt-6 text-sm font-semibold">
                        <Link className="inline-flex min-h-11 items-center hover:underline" href={`/solutions/${config.slug}`}>
                          {copy.solutions.detailAction}
                          <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                        </Link>
                        <Link
                          className="inline-flex min-h-11 items-center text-steel-blue hover:underline"
                          href={`/contact?service=${config.serviceType}`}
                        >
                          {copy.solutions.quoteAction}
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="flex justify-end border-t pt-8">
          <Button variant="outline" size="lg" asChild>
            <Link href="/solutions">
              {copy.solutions.allAction}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
