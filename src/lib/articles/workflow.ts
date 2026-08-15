import type {
  ArticleInputValues,
  ArticleStatusValue,
} from "@/lib/content/validation";

export type ArticleWorkflowErrorCode = "INVALID_SLUG" | "SLUG_LOCKED";

export class ArticleWorkflowError extends Error {
  constructor(readonly code: ArticleWorkflowErrorCode) {
    super(code);
    this.name = "ArticleWorkflowError";
  }
}

export interface ArticleLifecycleState {
  slug: string;
  publishedAt: Date | null;
}

export interface PreparedArticleInput extends ArticleInputValues {
  slug: string;
  publishedAt: Date | null;
}

/** Produces the canonical, stable URL segment used by every Article write. */
export function normalizeArticleSlug(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function canonicalSlug(value: string): string {
  const slug = normalizeArticleSlug(value);
  if (!slug || slug.length > 120) {
    throw new ArticleWorkflowError("INVALID_SLUG");
  }
  return slug;
}

export function firstPublishedAt(
  status: ArticleStatusValue,
  currentPublishedAt: Date | null,
  now: Date,
): Date | null {
  if (currentPublishedAt) return currentPublishedAt;
  return status === "PUBLISHED" ? now : null;
}

export function prepareArticleCreate(
  input: ArticleInputValues,
  now: Date,
): PreparedArticleInput {
  return {
    ...input,
    slug: canonicalSlug(input.slug),
    publishedAt: firstPublishedAt(input.status, null, now),
  };
}

export function prepareArticleUpdate(
  current: ArticleLifecycleState,
  input: ArticleInputValues,
  now: Date,
): PreparedArticleInput {
  const slug = canonicalSlug(input.slug);
  if (current.publishedAt && slug !== current.slug) {
    throw new ArticleWorkflowError("SLUG_LOCKED");
  }

  return {
    ...input,
    slug,
    publishedAt: firstPublishedAt(input.status, current.publishedAt, now),
  };
}
