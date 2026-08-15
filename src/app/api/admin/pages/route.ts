import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/authorization";
import { pageCreateSchema } from "@/lib/content/validation";

// 获取页面列表
export async function GET() {
  try {
    const authorization = await requireCapability("pages.manage");
    if (!authorization.authorized) return authorization.response;

    const pages = await prisma.page.findMany({
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(pages);
  } catch (error) {
    console.error("Error fetching pages:", error);
    return NextResponse.json({ error: "Failed to fetch pages" }, { status: 500 });
  }
}

// 创建新页面
export async function POST(request: NextRequest) {
  try {
    const authorization = await requireCapability("pages.manage");
    if (!authorization.authorized) return authorization.response;

    const body = pageCreateSchema.parse(await request.json());
    const { slug, title, titleEn, titleFr, content, contentEn, contentFr, status } = body;

    // 检查 slug 是否已存在
    const existing = await prisma.page.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json({ error: "Page with this slug already exists" }, { status: 409 });
    }

    const page = await prisma.page.create({
      data: {
        slug,
        title,
        titleEn: titleEn || null,
        titleFr: titleFr || null,
        content,
        contentEn: contentEn || null,
        contentFr: contentFr || null,
        status: status || "DRAFT",
        publishedAt: status === "PUBLISHED" ? new Date() : null,
      },
    });

    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "页面内容校验失败", fieldErrors: error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "请求正文必须是有效 JSON" }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Page with this slug already exists" }, { status: 409 });
    }
    console.error("Error creating page:", error);
    return NextResponse.json({ error: "Failed to create page" }, { status: 500 });
  }
}
