import { cache } from "react";
import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ArticleReadClient = Pick<PrismaClient, "article">;

export const PUBLISHED_ARTICLE_WHERE = {
  status: "PUBLISHED",
  publishedAt: { not: null },
} satisfies Prisma.ArticleWhereInput;

export const PUBLIC_ARTICLE_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  content: true,
  coverImage: true,
  coverImageAlt: true,
  seoTitle: true,
  seoDescription: true,
  category: true,
  author: true,
  tags: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ArticleSelect;

export async function findPublishedArticleBySlug(
  client: ArticleReadClient,
  slug: string,
) {
  return client.article.findFirst({
    where: { ...PUBLISHED_ARTICLE_WHERE, slug },
    select: PUBLIC_ARTICLE_SELECT,
  });
}

export const getPublishedArticleBySlug = cache((slug: string) =>
  findPublishedArticleBySlug(prisma, slug),
);

export async function listPublishedArticles(
  client: ArticleReadClient,
  input: {
    page: number;
    limit: number;
    category?: string;
    relatedTags?: string[];
  },
) {
  const where: Prisma.ArticleWhereInput = {
    ...PUBLISHED_ARTICLE_WHERE,
  };
  if (input.category) where.category = input.category;
  if (input.relatedTags?.length) {
    const relatedWhere: Prisma.ArticleWhereInput[] = [
      { tags: { hasSome: input.relatedTags } },
    ];
    if (input.category) relatedWhere.unshift({ category: input.category });
    where.OR = relatedWhere;
    delete where.category;
  }

  const [articles, total] = await Promise.all([
    client.article.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      select: PUBLIC_ARTICLE_SELECT,
    }),
    client.article.count({ where }),
  ]);

  return {
    articles,
    total,
    pages: Math.ceil(total / input.limit),
  };
}

export async function listPublishedArticleSitemapEntries(
  client: ArticleReadClient,
) {
  return client.article.findMany({
    where: PUBLISHED_ARTICLE_WHERE,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    select: { slug: true, updatedAt: true },
  });
}
