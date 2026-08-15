import {
  Prisma,
  type Article,
  type PrismaClient,
} from "@prisma/client";
import type { Clock } from "@/lib/ports/external-services";
import {
  articleInputSchema,
  type ArticleInputValues,
  type ArticleUpdateValues,
} from "@/lib/content/validation";
import {
  prepareArticleCreate,
  prepareArticleUpdate,
} from "@/lib/articles/workflow";
import type { CapabilityActor } from "@/lib/permissions";

export type ArticleServiceErrorCode = "ARTICLE_NOT_FOUND";

export class ArticleServiceError extends Error {
  constructor(readonly code: ArticleServiceErrorCode) {
    super(code);
    this.name = "ArticleServiceError";
  }
}

export const ARTICLE_ADMIN_SELECT = {
  id: true,
  title: true,
  content: true,
  slug: true,
  excerpt: true,
  coverImage: true,
  coverImageAlt: true,
  seoTitle: true,
  seoDescription: true,
  category: true,
  tags: true,
  status: true,
  authorId: true,
  author: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ArticleSelect;

function persistenceData(input: ReturnType<typeof prepareArticleCreate>) {
  return {
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt,
    content: input.content,
    coverImage: input.coverImage || null,
    coverImageAlt: input.coverImageAlt || null,
    seoTitle: input.seoTitle || null,
    seoDescription: input.seoDescription || null,
    category: input.category,
    tags: input.tags,
    status: input.status,
    publishedAt: input.publishedAt,
  };
}

function completeArticleInput(
  current: Article,
  update: ArticleUpdateValues,
): ArticleInputValues {
  return articleInputSchema.parse({
    title: update.title ?? current.title,
    slug: update.slug ?? current.slug,
    excerpt: update.excerpt ?? current.excerpt,
    content: update.content ?? current.content,
    coverImage: update.coverImage ?? current.coverImage ?? "",
    coverImageAlt: update.coverImageAlt ?? current.coverImageAlt ?? "",
    seoTitle: update.seoTitle ?? current.seoTitle ?? "",
    seoDescription: update.seoDescription ?? current.seoDescription ?? "",
    category: update.category ?? current.category,
    tags: update.tags ?? current.tags,
    status: update.status ?? current.status,
  });
}

async function lockArticle(
  transaction: Prisma.TransactionClient,
  id: string,
): Promise<Article> {
  const locked = await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "Article" WHERE "id" = ${id} FOR UPDATE
  `;
  if (locked.length === 0) {
    throw new ArticleServiceError("ARTICLE_NOT_FOUND");
  }

  const article = await transaction.article.findUnique({ where: { id } });
  if (!article) throw new ArticleServiceError("ARTICLE_NOT_FOUND");
  return article;
}

export async function createArticle(
  client: PrismaClient,
  input: {
    actor: CapabilityActor;
    article: ArticleInputValues;
    clock: Clock;
  },
) {
  const prepared = prepareArticleCreate(input.article, input.clock.now());
  return client.article.create({
    data: {
      ...persistenceData(prepared),
      authorId: input.actor.id,
      author: input.actor.name || input.actor.email,
    },
    select: ARTICLE_ADMIN_SELECT,
  });
}

export async function updateArticle(
  client: PrismaClient,
  input: { article: ArticleUpdateValues; clock: Clock },
) {
  return client.$transaction(async (transaction) => {
    const current = await lockArticle(transaction, input.article.id);
    const completeInput = completeArticleInput(current, input.article);
    const prepared = prepareArticleUpdate(current, completeInput, input.clock.now());
    const article = await transaction.article.update({
      where: { id: current.id },
      data: persistenceData(prepared),
      select: ARTICLE_ADMIN_SELECT,
    });

    return { article, previousSlug: current.slug };
  });
}

export async function deleteArticle(client: PrismaClient, id: string) {
  return client.$transaction(async (transaction) => {
    const current = await lockArticle(transaction, id);
    await transaction.article.delete({ where: { id: current.id } });
    return { id: current.id, slug: current.slug };
  });
}
