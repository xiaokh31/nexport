// 公共文章 API - 获取已发布的文章
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// GET - 获取已发布的文章列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const category = searchParams.get('category');
    const id = searchParams.get('id');
    const slug = searchParams.get('slug');

    // 如果请求单篇文章
    if (id || slug) {
      const article = await prisma.article.findFirst({
        where: {
          status: 'PUBLISHED',
          ...(id ? { id } : {}),
          ...(slug ? { slug } : {}),
        },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          content: true,
          coverImage: true,
          category: true,
          author: true,
          tags: true,
          publishedAt: true,
          createdAt: true,
        },
      });

      if (!article) {
        return NextResponse.json(
          { error: '文章不存在' },
          { status: 404 }
        );
      }

      return NextResponse.json({ article });
    }

    // 构建查询条件 - 只获取已发布的文章
    const where: Prisma.ArticleWhereInput = {
      status: 'PUBLISHED',
    };
    
    if (category && category !== 'all') {
      where.category = category;
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          coverImage: true,
          category: true,
          author: true,
          tags: true,
          publishedAt: true,
          createdAt: true,
        },
      }),
      prisma.article.count({ where }),
    ]);

    return NextResponse.json({
      articles,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('获取文章列表失败:', error);
    return NextResponse.json(
      { error: '获取文章列表失败' },
      { status: 500 }
    );
  }
}
