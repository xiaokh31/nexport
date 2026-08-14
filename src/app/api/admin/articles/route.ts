// 管理员文章管理 API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ArticleStatus, Prisma } from '@prisma/client';

// GET - 获取文章列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    // 只有管理员可以访问
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '无权限访问' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    // 构建查询条件
    const where: Prisma.ArticleWhereInput = {};
    
    if (status && status !== 'all') {
      where.status = status as ArticleStatus;
    }
    
    if (category && category !== 'all') {
      where.category = category;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          content: true,
          category: true,
          status: true,
          author: true,
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

// POST - 创建文章
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    // 只有管理员可以创建文章
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '无权限访问' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, content, category, status } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: '标题和内容不能为空' },
        { status: 400 }
      );
    }

    // 生成slug
    const slug = title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-');
    
    const article = await prisma.article.create({
      data: {
        title,
        content,
        slug,
        excerpt: content.substring(0, 200),
        category: category || 'news',
        status: status || 'DRAFT',
        author: session.user.name || session.user.email || 'Unknown',
      },
      select: {
        id: true,
        title: true,
        content: true,
        slug: true,
        excerpt: true,
        category: true,
        status: true,
        author: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      article,
    });
  } catch (error) {
    console.error('创建文章失败:', error);
    return NextResponse.json(
      { error: '创建文章失败' },
      { status: 500 }
    );
  }
}

// PATCH - 更新文章
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    // 只有管理员可以更新文章
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '无权限访问' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, title, content, category, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: '缺少文章ID' },
        { status: 400 }
      );
    }

    const updateData: Prisma.ArticleUpdateInput = {};
    if (title) {
      updateData.title = title;
      // 更新slug
      updateData.slug = title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-');
    }
    if (content) {
      updateData.content = content;
      updateData.excerpt = content.substring(0, 200);
    }
    if (category) updateData.category = category;
    if (status) {
      updateData.status = status as ArticleStatus;
      // 如果发布文章，设置发布时间
      if (status === 'PUBLISHED') {
        updateData.publishedAt = new Date();
      }
    }

    const article = await prisma.article.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        status: true,
        author: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      article,
    });
  } catch (error) {
    console.error('更新文章失败:', error);
    return NextResponse.json(
      { error: '更新文章失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除文章
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    // 只有管理员可以删除文章
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '无权限访问' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '缺少文章ID' },
        { status: 400 }
      );
    }

    await prisma.article.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: '文章删除成功',
    });
  } catch (error) {
    console.error('删除文章失败:', error);
    return NextResponse.json(
      { error: '删除文章失败' },
      { status: 500 }
    );
  }
}
