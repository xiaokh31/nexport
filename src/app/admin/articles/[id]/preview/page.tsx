import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Calendar, Edit, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/content/safe-markdown";
import { currentSessionActor } from "@/lib/authorization";
import { isAllowedMarkdownImage } from "@/lib/content/markdown-policy";
import { hasCapability } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "文章预览",
  robots: { index: false, follow: false },
};

const statusLabels = {
  DRAFT: "草稿",
  PUBLISHED: "已发布",
  ARCHIVED: "已归档",
} as const;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Edmonton",
  }).format(date);
}

export default async function ArticlePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await currentSessionActor();
  if (!actor) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/admin/articles/${id}/preview`)}`);
  }
  if (!hasCapability(actor, "articles.manage")) notFound();

  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) notFound();

  const coverImage = article.coverImage && isAllowedMarkdownImage(article.coverImage)
    ? article.coverImage
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" asChild>
          <Link href="/admin/articles">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回文章列表
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/admin/articles/${article.id}`}>
            <Edit className="mr-2 h-4 w-4" />
            编辑文章
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        受保护预览 · {statusLabels[article.status]}。此页不会对公众或搜索引擎发布。
      </div>

      <header className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{article.category}</Badge>
          {article.tags.map((tag) => (
            <Badge key={tag} variant="outline">{tag}</Badge>
          ))}
        </div>
        <h1 className="break-words text-3xl font-bold md:text-4xl">{article.title}</h1>
        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {article.author}
          </span>
          <span className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {formatDate(article.publishedAt || article.updatedAt)}
          </span>
        </div>
      </header>

      {coverImage && (
        <>
          {/* Editorial sources are constrained to same-origin paths by SAFE-001. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImage}
            alt={article.coverImageAlt || article.title}
            className="h-auto w-full rounded-lg border"
          />
        </>
      )}

      <article className="min-w-0">
        <p className="mb-8 border-b pb-8 text-lg text-muted-foreground">
          {article.excerpt}
        </p>
        <MarkdownRenderer content={article.content} />
      </article>
    </div>
  );
}
