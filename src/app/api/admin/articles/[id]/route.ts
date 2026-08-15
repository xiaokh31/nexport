// 管理员文章详情 API
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCapability } from '@/lib/authorization';
import { ARTICLE_ADMIN_SELECT } from '@/lib/articles/service';

interface Params {
  params: Promise<{ id: string }>;
}

// GET - 获取单篇文章详情
export async function GET(request: NextRequest, { params }: Params) {
  try {
    void request;
    const { id } = await params;

    const authorization = await requireCapability('articles.manage');
    if (!authorization.authorized) return authorization.response;

    const article = await prisma.article.findUnique({
      where: { id },
      select: ARTICLE_ADMIN_SELECT,
    });

    if (!article) {
      return NextResponse.json(
        { error: '文章不存在', code: 'ARTICLE_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error('获取文章详情失败:', error);
    return NextResponse.json(
      { error: '获取文章详情失败', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
