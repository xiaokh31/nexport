import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 获取页面列表
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { slug, title, titleEn, titleFr, content, contentEn, contentFr, status } = body;

    if (!slug || !title || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

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
        titleEn,
        titleFr,
        content,
        contentEn,
        contentFr,
        status: status || "DRAFT",
        publishedAt: status === "PUBLISHED" ? new Date() : null,
      },
    });

    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    console.error("Error creating page:", error);
    return NextResponse.json({ error: "Failed to create page" }, { status: 500 });
  }
}
