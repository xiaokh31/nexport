import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/authorization";
import {
  markdownContentSchema,
  pageUpdateSchema,
} from "@/lib/content/validation";

interface Params {
  params: Promise<{ id: string }>;
}

// 获取单个页面
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    
    const authorization = await requireCapability("pages.manage");
    if (!authorization.authorized) return authorization.response;

    const page = await prisma.page.findUnique({
      where: { id },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json(page);
  } catch (error) {
    console.error("Error fetching page:", error);
    return NextResponse.json({ error: "Failed to fetch page" }, { status: 500 });
  }
}

// 更新页面
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    
    const authorization = await requireCapability("pages.manage");
    if (!authorization.authorized) return authorization.response;

    const body = pageUpdateSchema.parse(await request.json());
    const { title, titleEn, titleFr, content, contentEn, contentFr, status, slug } = body;

    const current = await prisma.page.findUnique({
      where: { id },
      select: {
        status: true,
        content: true,
        contentEn: true,
        contentFr: true,
      },
    });
    if (!current) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // 构建更新数据
    const updateData: Prisma.PageUpdateInput = {};
    if (title !== undefined) updateData.title = title;
    if (titleEn !== undefined) updateData.titleEn = titleEn || null;
    if (titleFr !== undefined) updateData.titleFr = titleFr || null;
    if (content !== undefined) updateData.content = content;
    if (contentEn !== undefined) updateData.contentEn = contentEn || null;
    if (contentFr !== undefined) updateData.contentFr = contentFr || null;
    if (slug !== undefined) updateData.slug = slug;
    
    if (status !== undefined) {
      if (status === "PUBLISHED") {
        markdownContentSchema.parse(content ?? current.content);

        const nextContentEn = contentEn === undefined ? current.contentEn : contentEn;
        const nextContentFr = contentFr === undefined ? current.contentFr : contentFr;
        if (nextContentEn) markdownContentSchema.parse(nextContentEn);
        if (nextContentFr) markdownContentSchema.parse(nextContentFr);
      }

      updateData.status = status;
      if (status === "PUBLISHED" && current.status !== "PUBLISHED") {
        updateData.publishedAt = new Date();
      }
    }

    const page = await prisma.page.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(page);
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
    console.error("Error updating page:", error);
    return NextResponse.json({ error: "Failed to update page" }, { status: 500 });
  }
}

// 删除页面
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    
    const authorization = await requireCapability("pages.manage");
    if (!authorization.authorized) return authorization.response;

    await prisma.page.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Page deleted successfully" });
  } catch (error) {
    console.error("Error deleting page:", error);
    return NextResponse.json({ error: "Failed to delete page" }, { status: 500 });
  }
}
