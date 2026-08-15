import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { articlePublicQuerySchema } from "@/lib/content/validation";
import { prisma } from "@/lib/prisma";

function publicArticleError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "文章查询参数无效", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }
  console.error("获取文章失败:", error);
  return NextResponse.json(
    { error: "获取文章失败", code: "INTERNAL_ERROR" },
    { status: 500 },
  );
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const query = articlePublicQuerySchema.parse({
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
      category: searchParams.get("category") || undefined,
      id: searchParams.get("id") || undefined,
      slug: searchParams.get("slug") || undefined,
    });
    const publishedWhere: Prisma.ArticleWhereInput = {
      status: "PUBLISHED",
      publishedAt: { not: null },
    };

    if (query.id || query.slug) {
      const article = await prisma.article.findFirst({
        where: {
          ...publishedWhere,
          ...(query.id ? { id: query.id } : {}),
          ...(query.slug ? { slug: query.slug } : {}),
        },
        select: {
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
        },
      });

      if (!article) {
        return NextResponse.json(
          { error: "文章不存在", code: "ARTICLE_NOT_FOUND" },
          { status: 404 },
        );
      }
      return NextResponse.json({ article });
    }

    const where: Prisma.ArticleWhereInput = { ...publishedWhere };
    if (query.category !== "all") where.category = query.category;

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          coverImage: true,
          coverImageAlt: true,
          category: true,
          author: true,
          tags: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
        },
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
    return publicArticleError(error);
  }
}
