import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { MarkdownRenderer } from "@/components/content/safe-markdown";
import { ArticleSchema } from "@/components/seo/structured-data";
import { Button } from "@/components/ui/button";
import { publicEnv } from "@/config/env/public";
import { getPublishedArticleBySlug } from "@/lib/articles/public-service";
import { isAllowedMarkdownImage } from "@/lib/content/markdown-policy";
import { isPlaceholderIdentityValue } from "@/lib/seo/structured-data";

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

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  if (!article) notFound();

  const url = new URL(`/news/${article.slug}`, publicEnv.siteUrl).toString();
  const title = article.seoTitle || article.title;
  const description = article.seoDescription || article.excerpt;
  const image = article.coverImage && isAllowedMarkdownImage(article.coverImage)
    ? new URL(article.coverImage, publicEnv.siteUrl).toString()
    : null;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      publishedTime: article.publishedAt!.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      authors: isPlaceholderIdentityValue(article.author) ? undefined : [article.author],
      tags: article.tags,
      images: image ? [{ url: image, alt: article.coverImageAlt || article.title }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ArticleDetailPage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  if (!article) notFound();

  const coverImage = article.coverImage && isAllowedMarkdownImage(article.coverImage)
    ? article.coverImage
    : null;
  const displayAuthor = isPlaceholderIdentityValue(article.author) ? null : article.author;
  const articleUrl = new URL(`/news/${article.slug}`, publicEnv.siteUrl).toString();
  const structuredImage = coverImage
    ? new URL(coverImage, publicEnv.siteUrl).toString()
    : null;

  return (
    <>
      <ArticleSchema
        url={articleUrl}
        headline={article.title}
        description={article.seoDescription || article.excerpt}
        datePublished={article.publishedAt!}
        dateModified={article.updatedAt}
        author={article.author}
        image={structuredImage}
        section={categories[article.category] || article.category}
        tags={article.tags}
      />

      <header className="border-b-4 border-signal-amber bg-dock-navy py-12 text-paper-white md:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <Link
              href="/news"
              className="inline-flex min-h-11 items-center text-sm text-paper-white/75 hover:text-paper-white hover:underline"
            >
              <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
              返回内容列表
            </Link>

            <div className="mt-7 flex flex-wrap items-center gap-3 font-utility text-[0.68rem] uppercase tracking-[0.1em] text-paper-white/70">
              <span className="border-l-2 border-signal-amber pl-2 text-signal-amber">
                {categories[article.category] || article.category}
              </span>
              {article.tags.map((tag) => (
                <span key={tag} className="max-w-full break-all border border-paper-white/25 px-2 py-1">
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="mt-7 break-words font-display text-4xl font-bold text-paper-white sm:text-5xl md:text-6xl">
              {article.title}
            </h1>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-paper-white/70">
              {displayAuthor && (
                <span className="flex min-w-0 items-center gap-2 break-all">
                  <User className="size-4 shrink-0" aria-hidden="true" />
                  {displayAuthor}
                </span>
              )}
              <time className="flex items-center gap-2" dateTime={article.publishedAt!.toISOString()}>
                <Calendar className="size-4" aria-hidden="true" />
                {formatDate(article.publishedAt || article.createdAt)}
              </time>
            </div>
          </div>
        </div>
      </header>

      {coverImage && (
        <figure className="container py-8 md:py-10">
          <div className="mx-auto max-w-5xl border-b-4 border-signal-amber bg-concrete p-2">
            {/* The shared policy limits editorial images to same-origin paths. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImage}
              alt={article.coverImageAlt || article.title}
              className="block h-auto max-h-[42rem] w-full object-contain"
            />
          </div>
        </figure>
      )}

      <section className="py-10 md:py-16" aria-label="文章正文">
        <div className="container">
          <article className="mx-auto min-w-0 max-w-3xl">
            <p className="mb-9 break-words border-l-4 border-signal-amber bg-concrete p-5 text-base leading-8 text-muted-foreground md:text-lg">
              {article.excerpt}
            </p>
            <MarkdownRenderer content={article.content} />
          </article>
        </div>
      </section>

      <nav aria-label="文章导航" className="border-t-2 border-dock-navy py-8">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <Button variant="outline" asChild>
              <Link href="/news">
                <ArrowLeft aria-hidden="true" />
                返回内容列表
              </Link>
            </Button>
          </div>
        </div>
      </nav>
    </>
  );
}
