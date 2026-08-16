import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ArticleLinkItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  publishedAt: Date | null;
}

function formatDate(date: Date | null) {
  if (!date) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "America/Edmonton",
  }).format(date);
}

export function ArticleLinksSection({
  title,
  description,
  articles,
  viewAll = true,
}: {
  title: string;
  description?: string;
  articles: ArticleLinkItem[];
  viewAll?: boolean;
}) {
  if (articles.length === 0) return null;

  return (
    <section className="border-t py-16 md:py-24">
      <div className="container">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">{title}</h2>
            {description && <p className="mt-3 text-muted-foreground">{description}</p>}
          </div>
          {viewAll && (
            <Link href="/news" className="inline-flex items-center text-primary hover:underline">
              查看全部新闻
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          )}
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {articles.map((article) => (
            <Card key={article.id} className="group h-full transition-shadow hover:shadow-lg">
              <CardHeader>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded bg-primary/10 px-2 py-1 text-primary">
                    {article.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(article.publishedAt)}
                  </span>
                </div>
                <CardTitle className="text-xl group-hover:text-primary">
                  <h3>
                    <Link href={`/news/${article.slug}`}>{article.title}</Link>
                  </h3>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {article.excerpt}
                </p>
                <Link
                  href={`/news/${article.slug}`}
                  className="mt-4 inline-flex items-center text-sm text-primary hover:underline"
                >
                  阅读文章
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
