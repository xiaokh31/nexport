import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireCapability } from "@/lib/authorization";
import {
  ARTICLE_ADMIN_SELECT,
  ArticleServiceError,
  createArticle,
  deleteArticle,
  updateArticle,
} from "@/lib/articles/service";
import { ArticleWorkflowError } from "@/lib/articles/workflow";
import {
  articleAdminListQuerySchema,
  articleCreateSchema,
  articleUpdateSchema,
} from "@/lib/content/validation";
import { systemClock } from "@/lib/ports/external-services";
import { prisma } from "@/lib/prisma";

function articleErrorResponse(error: unknown, action: string) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "文章请求校验失败",
        code: "VALIDATION_ERROR",
        fieldErrors: error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json(
      { error: "请求正文必须是有效 JSON", code: "INVALID_JSON" },
      { status: 400 },
    );
  }
  if (error instanceof ArticleServiceError && error.code === "ARTICLE_NOT_FOUND") {
    return NextResponse.json(
      { error: "文章不存在", code: error.code },
      { status: 404 },
    );
  }
  if (error instanceof ArticleWorkflowError) {
    const messages = {
      INVALID_SLUG: "URL 别名无效",
      SLUG_LOCKED: "文章首次发布后不能修改 URL 别名",
    } as const;
    return NextResponse.json(
      { error: messages[error.code], code: error.code },
      { status: error.code === "SLUG_LOCKED" ? 409 : 400 },
    );
  }
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return NextResponse.json(
      { error: "URL 别名已存在", code: "SLUG_CONFLICT" },
      { status: 409 },
    );
  }

  console.error(`${action}文章失败:`, error);
  return NextResponse.json(
    { error: `${action}文章失败`, code: "INTERNAL_ERROR" },
    { status: 500 },
  );
}

function revalidateArticle(slugs: string[], id?: string) {
  revalidatePath("/news");
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/articles");
  for (const slug of new Set(slugs.filter(Boolean))) {
    revalidatePath(`/news/${slug}`);
  }
  if (id) {
    revalidatePath(`/admin/articles/${id}`);
    revalidatePath(`/admin/articles/${id}/preview`);
  }
}

export async function GET(request: NextRequest) {
  try {
    const authorization = await requireCapability("articles.manage");
    if (!authorization.authorized) return authorization.response;

    const searchParams = new URL(request.url).searchParams;
    const query = articleAdminListQuerySchema.parse({
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
      status: searchParams.get("status") || undefined,
      category: searchParams.get("category") || undefined,
      search: searchParams.get("search") || undefined,
    });
    const where: Prisma.ArticleWhereInput = {};

    if (query.status !== "all") where.status = query.status;
    if (query.category !== "all") where.category = query.category;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { excerpt: { contains: query.search, mode: "insensitive" } },
        { content: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: ARTICLE_ADMIN_SELECT,
      }),
      prisma.article.count({ where }),
    ]);

    return NextResponse.json({
      articles,
      total,
      page: query.page,
      pages: Math.ceil(total / query.limit),
    });
  } catch (error) {
    return articleErrorResponse(error, "获取");
  }
}

export async function POST(request: NextRequest) {
  try {
    const authorization = await requireCapability("articles.manage");
    if (!authorization.authorized) return authorization.response;

    const article = await createArticle(prisma, {
      actor: authorization.actor,
      article: articleCreateSchema.parse(await request.json()),
      clock: systemClock,
    });
    revalidateArticle([article.slug], article.id);

    return NextResponse.json({ success: true, article }, { status: 201 });
  } catch (error) {
    return articleErrorResponse(error, "创建");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authorization = await requireCapability("articles.manage");
    if (!authorization.authorized) return authorization.response;

    const result = await updateArticle(prisma, {
      article: articleUpdateSchema.parse(await request.json()),
      clock: systemClock,
    });
    revalidateArticle(
      [result.previousSlug, result.article.slug],
      result.article.id,
    );

    return NextResponse.json({ success: true, article: result.article });
  } catch (error) {
    return articleErrorResponse(error, "更新");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authorization = await requireCapability("articles.manage");
    if (!authorization.authorized) return authorization.response;

    const id = new URL(request.url).searchParams.get("id")?.trim();
    if (!id) {
      return NextResponse.json(
        { error: "缺少文章 ID", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const deleted = await deleteArticle(prisma, id);
    revalidateArticle([deleted.slug], deleted.id);
    return NextResponse.json({ success: true, message: "文章删除成功" });
  } catch (error) {
    return articleErrorResponse(error, "删除");
  }
}
