// 管理员文章管理 API
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ArticleStatus, Prisma } from '@prisma/client';
import { requireCapability } from '@/lib/authorization';

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// GET - 获取文章列表
export async function GET(request: NextRequest) {
  try {
    const authorization = await requireCapability('articles.manage');
    if (!authorization.authorized) return authorization.response;

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
    const authorization = await requireCapability('articles.manage');
    if (!authorization.authorized) return authorization.response;
    const { actor } = authorization;

    const body = await request.json();
    const {
      title,
      slug: requestedSlug,
      excerpt,
      content,
      coverImage,
      coverImageAlt,
      seoTitle,
      seoDescription,
      category,
      tags,
      status,
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: '标题和内容不能为空' },
        { status: 400 }
      );
    }

    const slug = normalizeSlug(requestedSlug || title);
    if (!slug) {
      return NextResponse.json(
        { error: 'URL 别名不能为空' },
        { status: 400 }
      );
    }
    const articleStatus = (status || 'DRAFT') as ArticleStatus;
    
    const article = await prisma.article.create({
      data: {
        title,
        content,
        slug,
        excerpt: excerpt || content.substring(0, 200),
        coverImage: coverImage || null,
        coverImageAlt: coverImageAlt || null,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        category: category || 'news',
        tags: Array.isArray(tags) ? tags : [],
        status: articleStatus,
        publishedAt: articleStatus === 'PUBLISHED' ? new Date() : null,
        authorId: actor.id,
        author: actor.name || actor.email,
      },
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

    return NextResponse.json({
      success: true,
      article,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'URL 别名已存在' },
        { status: 409 }
      );
    }
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
    const authorization = await requireCapability('articles.manage');
    if (!authorization.authorized) return authorization.response;

    const body = await request.json();
    const {
      id,
      title,
      slug,
      excerpt,
      content,
      coverImage,
      coverImageAlt,
      seoTitle,
      seoDescription,
      category,
      tags,
      status,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: '缺少文章ID' },
        { status: 400 }
      );
    }

    const current = await prisma.article.findUnique({
      where: { id },
      select: { slug: true, publishedAt: true },
    });
    if (!current) {
      return NextResponse.json(
        { error: '文章不存在' },
        { status: 404 }
      );
    }

    const updateData: Prisma.ArticleUpdateInput = {};
    if (title) {
      updateData.title = title;
    }
    if (slug !== undefined) {
      const normalizedSlug = normalizeSlug(slug);
      if (!normalizedSlug) {
        return NextResponse.json(
          { error: 'URL 别名不能为空' },
          { status: 400 }
        );
      }
      if (current.publishedAt && normalizedSlug !== current.slug) {
        return NextResponse.json(
          { error: '文章首次发布后不能修改 URL 别名' },
          { status: 409 }
        );
      }
      updateData.slug = normalizedSlug;
    }
    if (content) {
      updateData.content = content;
      if (excerpt === undefined) updateData.excerpt = content.substring(0, 200);
    }
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (coverImage !== undefined) updateData.coverImage = coverImage || null;
    if (coverImageAlt !== undefined) updateData.coverImageAlt = coverImageAlt || null;
    if (seoTitle !== undefined) updateData.seoTitle = seoTitle || null;
    if (seoDescription !== undefined) updateData.seoDescription = seoDescription || null;
    if (category) updateData.category = category;
    if (Array.isArray(tags)) updateData.tags = tags;
    if (status) {
      updateData.status = status as ArticleStatus;
      // 只在第一次进入发布状态时记录发布时间。
      if (status === 'PUBLISHED' && !current.publishedAt) {
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

    return NextResponse.json({
      success: true,
      article,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'URL 别名已存在' },
        { status: 409 }
      );
    }
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
    const authorization = await requireCapability('articles.manage');
    if (!authorization.authorized) return authorization.response;

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
