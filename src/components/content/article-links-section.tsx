"use client";

import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { getMarketingCopy } from "@/config/marketing-content";
import { useLocale } from "@/i18n/locale-context";

export interface ArticleLinkItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  publishedAt: Date | null;
}

function formatDate(date: Date | null, locale: "zh" | "en" | "fr") {
  if (!date) return "";
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "America/Edmonton",
  }).format(date);
}

export function ArticleLinksSection({
  articles,
  viewAll = true,
  context = "home",
}: {
  articles: ArticleLinkItem[];
  viewAll?: boolean;
  context?: "home" | "related";
}) {
  const { locale, t } = useLocale();
  const copy = getMarketingCopy(locale).articles;
  const title = context === "home" ? copy.homeTitle : copy.relatedTitle;
  const description = context === "home" ? copy.homeDescription : undefined;

  if (articles.length === 0) return null;

  return (
    <section className="border-t-2 border-dock-navy bg-paper-white py-16 md:py-24">
      <div className="container">
        <div className="grid gap-6 border-b-2 border-dock-navy pb-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="font-utility text-xs font-semibold uppercase tracking-[0.16em] text-steel-blue">
              JOURNAL / PUBLISHED
            </p>
            <h2 className="mt-4 font-display text-4xl font-bold md:text-5xl">{title}</h2>
            {description && <p className="mt-3 max-w-2xl text-muted-foreground">{description}</p>}
          </div>
          {viewAll && (
            <Link href="/news" className="inline-flex min-h-11 items-center font-semibold hover:underline">
              {t.common.viewAll} {t.nav.news}
              <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </Link>
          )}
        </div>
        <div className="grid border-b border-border md:grid-cols-3">
          {articles.map((article) => (
            <article key={article.id} className="flex min-h-64 flex-col border-b border-border p-6 md:border-b-0 md:border-r md:last:border-r-0">
              <div className="font-utility flex flex-wrap items-center gap-3 text-[0.68rem] uppercase tracking-[0.1em] text-muted-foreground">
                <span className="break-all border-l-2 border-signal-amber pl-2 text-steel-blue">{article.category}</span>
                {article.publishedAt && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-3" aria-hidden="true" />
                    {formatDate(article.publishedAt, locale)}
                  </span>
                )}
              </div>
              <h3 className="mt-6 break-words text-xl font-semibold">
                <Link href={`/news/${article.slug}`} className="underline-offset-4 hover:underline">
                  {article.title}
                </Link>
              </h3>
              <p className="mt-4 line-clamp-3 break-words text-sm leading-7 text-muted-foreground">{article.excerpt}</p>
              <Link
                href={`/news/${article.slug}`}
                className="mt-auto inline-flex min-h-11 items-end pt-5 text-sm font-semibold hover:underline"
              >
                {t.common.readMore}
                <ArrowRight className="ml-2 size-4" aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
