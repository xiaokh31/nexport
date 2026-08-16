import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { publicEnv } from "@/config/env/public";
import { articlePublicQuerySchema } from "@/lib/content/validation";
import { listPublishedArticles } from "@/lib/articles/public-service";
import { prisma } from "@/lib/prisma";

const categories = {
  all: "全部",
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
  const title = query.category === "all" ? "新闻动态" : categoryLabel;
  const pageSuffix = query.page > 1 ? `—第 ${query.page} 页` : "";

  return {
    title: `${title}${pageSuffix}`,
    description: "了解最新物流服务公告、行业资讯与政策解读。",
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: "website",
      url: `${publicEnv.siteUrl}${canonicalPath}`,
      title: `${title}${pageSuffix}`,
      description: "了解最新物流服务公告、行业资讯与政策解读。",
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
      <section className="bg-gradient-to-br from-primary/5 to-primary/10 py-16 md:py-24">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-6 text-4xl font-bold md:text-5xl">新闻动态</h1>
            <p className="text-lg text-muted-foreground">
              了解最新物流服务公告、行业资讯与政策解读
            </p>
          </div>
        </div>
      </section>

      <nav aria-label="新闻分类" className="border-b py-8">
        <div className="container flex flex-wrap justify-center gap-2">
          {Object.entries(categories).map(([key, label]) => (
            <Button
              key={key}
              variant={query.category === key ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link href={newsHref(1, key)}>{label}</Link>
            </Button>
          ))}
        </div>
      </nav>

      <section className="py-16 md:py-24">
        <div className="container">
          {result.articles.length > 0 ? (
            <>
              <div className="grid gap-8 md:grid-cols-2">
                {result.articles.map((article) => (
                  <Card key={article.id} className="group transition-shadow hover:shadow-lg">
                    <CardHeader>
                      <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="rounded bg-primary/10 px-2 py-1 text-xs text-primary">
                          {categories[article.category as keyof typeof categories] || article.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(article.publishedAt!)}
                        </span>
                      </div>
                      <CardTitle className="transition-colors group-hover:text-primary">
                        <h2 className="text-xl">
                          <Link href={`/news/${article.slug}`}>{article.title}</Link>
                        </h2>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="mb-4 line-clamp-2">
                        {article.excerpt}
                      </CardDescription>
                      <Link
                        href={`/news/${article.slug}`}
                        className="inline-flex items-center text-sm text-primary hover:underline"
                      >
                        阅读更多
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {result.pages > 1 && (
                <nav aria-label="新闻分页" className="mt-12 flex items-center justify-center gap-3">
                  {query.page > 1 ? (
                    <Button variant="outline" asChild>
                      <Link rel="prev" href={newsHref(query.page - 1, query.category)}>
                        上一页
                      </Link>
                    </Button>
                  ) : <span />}
                  <span className="px-2 text-sm text-muted-foreground">
                    第 {query.page} / {result.pages} 页
                  </span>
                  {query.page < result.pages ? (
                    <Button variant="outline" asChild>
                      <Link rel="next" href={newsHref(query.page + 1, query.category)}>
                        下一页
                      </Link>
                    </Button>
                  ) : <span />}
                </nav>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <p className="text-lg">暂无已发布文章</p>
              <p className="mt-2 text-sm">请稍后再来查看</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
