"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getMarketingCopy,
  getSolutionPurpose,
  getSolutionUiContent,
} from "@/config/marketing-content";
import { getSolutionBySlug, solutionConfigs } from "@/config/site-config";
import { useLocale } from "@/i18n/locale-context";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function SolutionDetailPage({ params }: PageProps) {
  const { slug } = use(params);
  const { locale } = useLocale();
  const config = getSolutionBySlug(slug);
  if (!config) notFound();

  const copy = getMarketingCopy(locale);
  const content = getSolutionUiContent(locale, config.key);
  const purpose = getSolutionPurpose(locale, config.key);
  if (!purpose) notFound();

  const relatedSolutions = purpose.solutionKeys
    .filter((key) => key !== config.key)
    .map((key) => {
      const relatedConfig = solutionConfigs.find((item) => item.key === key);
      return relatedConfig
        ? { ...relatedConfig, content: getSolutionUiContent(locale, key) }
        : null;
    })
    .filter((item) => item !== null);

  return (
    <>
      <section className="border-b-4 border-signal-amber bg-dock-navy py-14 text-paper-white md:py-20">
        <div className="container">
          <Link
            href="/solutions"
            className="inline-flex min-h-11 items-center text-sm text-paper-white/75 hover:text-paper-white hover:underline"
          >
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            {copy.detail.back}
          </Link>
          <div className="mt-7 grid gap-9 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <p className="font-utility text-xs font-semibold tracking-[0.16em] text-signal-amber">
                {purpose.marker} / {config.serviceType}
              </p>
              <h1 className="mt-5 max-w-4xl font-display text-5xl font-bold text-paper-white md:text-6xl">
                {content.title}
              </h1>
              <p className="mt-6 max-w-3xl leading-8 text-paper-white/[0.78]">{content.summary}</p>
            </div>
            <div className="border-l-4 border-signal-amber bg-paper-white/[0.08] p-6">
              <h2 className="font-utility text-xs font-semibold uppercase tracking-[0.14em] text-signal-amber">
                {copy.detail.suitedFor}
              </h2>
              <ul className="mt-4 space-y-3 text-sm text-paper-white/85">
                {purpose.suitedFor.map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 md:py-20" aria-labelledby="service-scope-title">
        <div className="container grid gap-10 lg:grid-cols-[0.65fr_1.35fr] lg:gap-16">
          <div>
            <p className="font-utility text-xs font-semibold uppercase tracking-[0.16em] text-steel-blue">
              SCOPE
            </p>
            <h2 id="service-scope-title" className="mt-4 font-display text-4xl font-bold">{copy.detail.scope}</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="border-t-2 border-dock-navy bg-concrete p-6">
              <h3 className="text-lg font-semibold">{copy.detail.included}</h3>
              <ul className="mt-5 space-y-4">
                {content.capabilities.map((capability) => (
                  <li key={capability} className="flex gap-3 text-sm leading-6">
                    <Check className="mt-0.5 size-4 shrink-0 text-steel-blue" aria-hidden="true" />
                    {capability}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t-2 border-signal-amber p-6">
              <h3 className="text-lg font-semibold">{copy.detail.excluded}</h3>
              <p className="mt-5 flex gap-3 text-sm leading-7 text-muted-foreground">
                <Minus className="mt-1 size-4 shrink-0 text-signal-amber" aria-hidden="true" />
                {content.exclusion}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y bg-concrete py-14 md:py-20" aria-labelledby="service-process-title">
        <div className="container">
          <div className="grid gap-5 lg:grid-cols-[0.65fr_1.35fr] lg:items-end">
            <p className="font-utility text-xs font-semibold uppercase tracking-[0.16em] text-steel-blue">
              PROCESS
            </p>
            <h2 id="service-process-title" className="font-display text-4xl font-bold">{copy.detail.process}</h2>
          </div>
          <ol className="mt-10 grid border-2 border-dock-navy bg-dock-navy md:grid-cols-2 xl:grid-cols-4">
            {purpose.process.map((step, index) => (
              <li key={step.title} className="border-b border-r border-paper-white/25 bg-paper-white p-6 xl:border-b-0">
                <span className="font-utility text-xs font-semibold text-steel-blue">0{index + 1}</span>
                <h3 className="mt-7 text-lg font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-14 md:py-20" aria-labelledby="quote-info-title">
        <div className="container grid gap-10 lg:grid-cols-[0.65fr_1.35fr] lg:gap-16">
          <div>
            <p className="font-utility text-xs font-semibold uppercase tracking-[0.16em] text-steel-blue">
              QUOTE INPUT
            </p>
            <h2 id="quote-info-title" className="mt-4 font-display text-4xl font-bold">{copy.detail.required}</h2>
          </div>
          <div>
            <ul className="grid border-t-2 border-dock-navy sm:grid-cols-2">
              {purpose.requiredInfo.map((item) => (
                <li key={item} className="flex min-h-24 gap-4 border-b border-border p-5 sm:odd:border-r">
                  <Check className="mt-0.5 size-4 shrink-0 text-steel-blue" aria-hidden="true" />
                  <span className="font-medium">{item}</span>
                </li>
              ))}
            </ul>
            <Button size="lg" asChild className="mt-7">
              <Link href={`/contact?service=${config.serviceType}`}>
                {copy.detail.quote}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-y bg-paper-white py-14 md:py-20" aria-labelledby="service-faq-title">
        <div className="container grid gap-10 lg:grid-cols-[0.65fr_1.35fr] lg:gap-16">
          <div>
            <p className="font-utility text-xs font-semibold uppercase tracking-[0.16em] text-steel-blue">
              FAQ
            </p>
            <h2 id="service-faq-title" className="mt-4 font-display text-4xl font-bold">{copy.detail.faq}</h2>
          </div>
          <div className="border-t-2 border-dock-navy">
            {copy.detail.faqItems.map((item) => (
              <details key={item.question} className="group border-b border-border py-5">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-5 font-semibold marker:content-none">
                  {item.question}
                  <span className="font-utility text-xl text-signal-amber group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="max-w-3xl pb-2 pr-10 text-sm leading-7 text-muted-foreground">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {relatedSolutions.length > 0 && (
        <section className="bg-concrete py-12" aria-labelledby="related-solutions-title">
          <div className="container grid gap-6 md:grid-cols-[0.65fr_1.35fr]">
            <h2 id="related-solutions-title" className="font-display text-3xl font-bold">{copy.detail.related}</h2>
            <div className="grid gap-px border bg-border sm:grid-cols-2">
              {relatedSolutions.map((solution) => (
                <Link
                  key={solution.slug}
                  href={`/solutions/${solution.slug}`}
                  className="flex min-h-20 items-center justify-between gap-4 bg-paper-white p-5 font-semibold hover:underline"
                >
                  {solution.content.title}
                  <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
