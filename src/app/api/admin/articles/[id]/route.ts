// 管理员文章详情 API
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCapability } from '@/lib/authorization';

interface Params {
  params: Promise<{ id: string }>;
}

// GET - 获取单篇文章详情
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    
    const authorization = await requireCapability('articles.manage');
    if (!authorization.authorized) return authorization.response;

    const article = await prisma.article.findUnique({
      where: { id },
      select: {
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
      },
    });

    if (!article) {
      return NextResponse.json(
        { error: '文章不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error('获取文章详情失败:', error);
    return NextResponse.json(
      { error: '获取文章详情失败' },
      { status: 500 }
    );
  }
}
