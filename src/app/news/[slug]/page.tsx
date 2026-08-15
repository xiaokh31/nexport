import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/content/safe-markdown";
import { isAllowedMarkdownImage } from "@/lib/content/markdown-policy";
import { prisma } from "@/lib/prisma";

const categories: Record<string, string> = {
  company: "公司新闻",
  industry: "行业资讯",
  service: "服务公告",
  policy: "政策解读",
};

function formatDate(date: Date | null) {
  if (!date) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Edmonton",
  }).format(date);
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await prisma.article.findFirst({
    where: {
      status: "PUBLISHED",
      OR: [{ slug }, { id: slug }],
    },
    select: {
      title: true,
      excerpt: true,
      content: true,
      coverImage: true,
      coverImageAlt: true,
      category: true,
      author: true,
      tags: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  if (!article) notFound();

  const coverImage = article.coverImage && isAllowedMarkdownImage(article.coverImage)
    ? article.coverImage
    : null;

  return (
    <>
      <section className="bg-gradient-to-br from-primary/5 to-primary/10 py-16 md:py-24">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <Button variant="ghost" asChild className="mb-6">
              <Link href="/news">
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回新闻列表
              </Link>
            </Button>

            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {categories[article.category] || article.category}
              </Badge>
              {article.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>

            <h1 className="mb-6 break-words text-3xl font-bold md:text-4xl">
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {article.author}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDate(article.publishedAt || article.createdAt)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {coverImage && (
        <section className="container py-8">
          <div className="mx-auto max-w-4xl">
            {/* The source is constrained to a same-origin path by the shared content policy. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImage}
              alt={article.coverImageAlt || article.title}
              className="h-auto w-full rounded-lg shadow-lg"
            />
          </div>
        </section>
      )}

      <section className="py-12 md:py-16">
        <div className="container">
          <article className="mx-auto min-w-0 max-w-3xl">
            <p className="mb-8 break-words border-b pb-8 text-lg text-muted-foreground">
              {article.excerpt}
            </p>
            <MarkdownRenderer content={article.content} />
          </article>
        </div>
      </section>

      <section className="border-t py-8">
        <div className="container">
          <div className="mx-auto flex max-w-3xl justify-between">
            <Button variant="outline" asChild>
              <Link href="/news">
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回新闻列表
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
