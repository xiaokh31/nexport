import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { use } from "react";

interface Params {
  params: Promise<{ id: string }>;
}

// 获取单个页面
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, titleEn, titleFr, content, contentEn, contentFr, status, slug } = body;

    // 构建更新数据
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (titleEn !== undefined) updateData.titleEn = titleEn;
    if (titleFr !== undefined) updateData.titleFr = titleFr;
    if (content !== undefined) updateData.content = content;
    if (contentEn !== undefined) updateData.contentEn = contentEn;
    if (contentFr !== undefined) updateData.contentFr = contentFr;
    if (slug !== undefined) updateData.slug = slug;
    
    if (status !== undefined) {
      updateData.status = status;
      if (status === "PUBLISHED") {
        // 检查当前状态
        const current = await prisma.page.findUnique({ where: { id } });
        if (current && current.status !== "PUBLISHED") {
          updateData.publishedAt = new Date();
        }
      }
    }

    const page = await prisma.page.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(page);
  } catch (error) {
    console.error("Error updating page:", error);
    return NextResponse.json({ error: "Failed to update page" }, { status: 500 });
  }
}

// 删除页面
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 });
    }

    await prisma.page.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Page deleted successfully" });
  } catch (error) {
    console.error("Error deleting page:", error);
    return NextResponse.json({ error: "Failed to delete page" }, { status: 500 });
  }
}
