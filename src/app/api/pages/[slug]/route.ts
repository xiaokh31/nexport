import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ slug: string }>;
}

// 公共 API - 获取已发布的页面内容
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;

    const page = await prisma.page.findUnique({
      where: { slug },
    });

    if (!page || page.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json({
      slug: page.slug,
      title: page.title,
      titleEn: page.titleEn,
      titleFr: page.titleFr,
      content: page.content,
      contentEn: page.contentEn,
      contentFr: page.contentFr,
      publishedAt: page.publishedAt,
    });
  } catch (error) {
    console.error("Error fetching page:", error);
    return NextResponse.json({ error: "Failed to fetch page" }, { status: 500 });
  }
}
