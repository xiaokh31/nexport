import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publicEnv } from "@/config/env/public";
import { listPublishedArticles } from "@/lib/articles/public-service";
import { articlePublicQuerySchema } from "@/lib/content/validation";
import { prisma } from "@/lib/prisma";

const categories = {
  all: "全部内容",
  company: "公司新闻",
  industry: "行业资讯",
  service: "服务公告",
  policy: "政策解读",
} as const;

interface NewsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseSearchParams(params: Record<string, string | string[] | undefined>) {
  const parsed = articlePublicQuerySchema.safeParse({
    page: firstValue(params.page) || undefined,
    limit: 10,
    category: firstValue(params.category) || undefined,
  });
  if (!parsed.success || !Object.hasOwn(categories, parsed.data.category)) notFound();
  return parsed.data;
}

function newsHref(page: number, category: string) {
  const params = new URLSearchParams();
  if (category !== "all") params.set("category", category);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/news?${query}` : "/news";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Edmonton",
  }).format(date);
}

export async function generateMetadata({ searchParams }: NewsPageProps): Promise<Metadata> {
  const query = parseSearchParams(await searchParams);
  const canonicalPath = newsHref(query.page, query.category);
  const categoryLabel = categories[query.category as keyof typeof categories];
  const title = query.category === "all" ? "行业内容与服务公告" : categoryLabel;
  const pageSuffix = query.page > 1 ? `—第 ${query.page} 页` : "";

  return {
    title: `${title}${pageSuffix}`,
    description: "查看已发布的服务公告、行业资讯、政策解读和公司新闻。",
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: "website",
      url: `${publicEnv.siteUrl}${canonicalPath}`,
      title: `${title}${pageSuffix}`,
      description: "查看已发布的服务公告、行业资讯、政策解读和公司新闻。",
    },
  };
}

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const query = parseSearchParams(await searchParams);
  const result = await listPublishedArticles(prisma, {
    page: query.page,
    limit: query.limit,
    category: query.category === "all" ? undefined : query.category,
  });
  if (query.page > 1 && (result.pages === 0 || query.page > result.pages)) notFound();

  return (
    <>
      <section className="border-b-4 border-signal-amber bg-dock-navy py-16 text-paper-white md:py-24">
        <div className="container grid gap-8 lg:grid-cols-[0.65fr_1.35fr] lg:items-end">
          <p className="font-utility text-xs font-semibold uppercase tracking-[0.18em] text-signal-amber">
            PUBLISHED / JOURNAL
          </p>
          <div>
            <h1 className="font-display text-5xl font-bold text-paper-white md:text-6xl">
              行业内容与服务公告
            </h1>
            <p className="mt-5 max-w-3xl leading-8 text-paper-white/75">
              按发布时间查看已公开的服务公告、行业资讯、政策解读和公司新闻。
            </p>
          </div>
        </div>
      </section>

      <nav aria-label="新闻分类" className="border-b-2 border-dock-navy bg-concrete">
        <div className="container overflow-x-auto">
          <ul className="flex min-w-max" role="list">
            {Object.entries(categories).map(([key, label]) => {
              const active = query.category === key;
              return (
                <li key={key}>
                  <Link
                    href={newsHref(1, key)}
                    aria-current={active ? "page" : undefined}
                    className="flex min-h-14 items-center border-r border-border px-5 text-sm font-semibold hover:bg-paper-white aria-[current=page]:bg-dock-navy aria-[current=page]:text-paper-white"
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <section className="bg-paper-white py-14 md:py-20" aria-labelledby="news-results-title">
        <div className="container">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-dock-navy pb-6">
            <div>
              <p className="font-utility text-xs uppercase tracking-[0.14em] text-steel-blue">
                {categories[query.category as keyof typeof categories]}
              </p>
              <h2 id="news-results-title" className="mt-3 font-display text-3xl font-bold md:text-4xl">
                已发布内容
              </h2>
            </div>
            <p className="font-utility text-xs text-muted-foreground">
              {result.total} 篇
            </p>
          </div>

          {result.articles.length > 0 ? (
            <>
              <div className="divide-y divide-border">
                {result.articles.map((article) => (
                  <article key={article.id} className="grid gap-5 py-8 md:grid-cols-[11rem_1fr_auto] md:items-start md:gap-8">
                    <div className="font-utility flex flex-wrap gap-x-4 gap-y-2 text-[0.68rem] uppercase tracking-[0.1em] text-muted-foreground md:block">
                      <p className="border-l-2 border-signal-amber pl-2 text-steel-blue">
                        {categories[article.category as keyof typeof categories] || article.category}
                      </p>
                      <time className="mt-0 flex items-center gap-2 md:mt-4" dateTime={article.publishedAt!.toISOString()}>
                        <Calendar className="size-3" aria-hidden="true" />
                        {formatDate(article.publishedAt!)}
                      </time>
                    </div>
                    <div className="min-w-0">
                      <h3 className="break-words text-xl font-semibold md:text-2xl">
                        <Link href={`/news/${article.slug}`} className="underline-offset-4 hover:underline">
                          {article.title}
                        </Link>
                      </h3>
                      <p className="mt-3 max-w-3xl break-words text-sm leading-7 text-muted-foreground">
                        {article.excerpt}
                      </p>
                    </div>
                    <Link
                      href={`/news/${article.slug}`}
                      aria-label={`阅读：${article.title}`}
                      className="inline-flex min-h-11 items-center self-center text-sm font-semibold hover:underline md:self-start"
                    >
                      阅读全文
                      <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                    </Link>
                  </article>
                ))}
              </div>

              {result.pages > 1 && (
                <nav aria-label="新闻分页" className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t-2 border-dock-navy pt-6">
                  <div>
                    {query.page > 1 && (
                      <Button variant="outline" asChild>
                        <Link rel="prev" href={newsHref(query.page - 1, query.category)}>
                          <ArrowLeft aria-hidden="true" />
                          上一页
                        </Link>
                      </Button>
                    )}
                  </div>
                  <span className="font-utility text-xs text-muted-foreground">
                    第 {query.page} / {result.pages} 页
                  </span>
                  <div>
                    {query.page < result.pages && (
                      <Button variant="outline" asChild>
                        <Link rel="next" href={newsHref(query.page + 1, query.category)}>
                          下一页
                          <ArrowRight aria-hidden="true" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </nav>
              )}
            </>
          ) : (
            <div className="border-b border-border py-16 text-center">
              <FileText className="mx-auto size-9 text-steel-blue" aria-hidden="true" />
              <h3 className="mt-5 text-xl font-semibold">该分类暂无已发布内容</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {query.category === "all" ? "目前没有可查看的内容，可以先浏览解决方案或稍后再来。" : "可以返回全部内容查看其他已发布文章。"}
              </p>
              <Button variant="outline" asChild className="mt-6">
                <Link href={query.category === "all" ? "/solutions" : "/news"}>
                  {query.category === "all" ? "查看解决方案" : "查看全部内容"}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
