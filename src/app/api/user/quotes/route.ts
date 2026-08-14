// 用户询价记录 API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { QuoteStatus, Prisma } from '@prisma/client';

// GET - 获取用户的询价记录
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    // 查询条件：通过userId或邮箱匹配
    const where: Prisma.QuoteWhereInput = {
      OR: [
        { userId: user.id },
        { email: user.email },
      ],
    };

    // 如果指定了状态且不是'all'
    if (status && status !== 'all' && Object.values(QuoteStatus).includes(status as QuoteStatus)) {
      where.status = status as QuoteStatus;
    }

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.quote.count({ where }),
    ]);

    return NextResponse.json({
      quotes,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('获取询价记录失败:', error);
    return NextResponse.json(
      { error: '获取询价记录失败' },
      { status: 500 }
    );
  }
}
