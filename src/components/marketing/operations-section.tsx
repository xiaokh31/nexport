"use client";

import { ArrowDown } from "lucide-react";
import { getMarketingCopy, getOperationStages } from "@/config/marketing-content";
import { useLocale } from "@/i18n/locale-context";

export function OperationsSection() {
  const { locale } = useLocale();
  const copy = getMarketingCopy(locale).process;
  const stages = getOperationStages(locale);

  return (
    <section className="bg-concrete py-16 md:py-24" aria-labelledby="operations-title">
      <div className="container">
        <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <p className="font-utility text-xs font-semibold uppercase tracking-[0.18em] text-steel-blue">
            {copy.eyebrow}
          </p>
          <div>
            <h2 id="operations-title" className="font-display text-4xl font-bold md:text-5xl">
              {copy.title}
            </h2>
            <p className="mt-4 max-w-3xl text-muted-foreground">{copy.description}</p>
          </div>
        </div>

        <ol className="mt-12 grid border-2 border-dock-navy bg-dock-navy md:grid-cols-2 xl:grid-cols-4">
          {stages.map((stage, index) => (
            <li
              key={stage.code}
              className="operation-stage relative border-b border-r border-paper-white/25 bg-paper-white p-5 last:border-b-0 md:[&:nth-child(3)]:border-b-0 xl:border-b-0"
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
                <span className="font-utility text-[0.68rem] font-semibold tracking-[0.14em] text-steel-blue">
                  {stage.code}
                </span>
                {index < stages.length - 1 && <ArrowDown className="size-4 text-signal-amber xl:-rotate-90" aria-hidden="true" />}
              </div>
              <h3 className="mt-5 font-display text-2xl font-bold">{stage.title}</h3>
              <dl className="mt-6 space-y-5 text-sm">
                <div>
                  <dt className="font-utility text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">{copy.customerLabel}</dt>
                  <dd className="mt-1 leading-6">{stage.customer}</dd>
                </div>
                <div>
                  <dt className="font-utility text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">{copy.operationLabel}</dt>
                  <dd className="mt-1 leading-6">{stage.operation}</dd>
                </div>
                <div>
                  <dt className="font-utility text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">{copy.outcomeLabel}</dt>
                  <dd className="mt-1 border-l-2 border-signal-amber pl-3 leading-6">{stage.outcome}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
