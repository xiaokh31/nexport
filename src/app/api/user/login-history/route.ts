// 登录历史 API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - 获取登录历史
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
    const limit = parseInt(searchParams.get('limit') || '20');

    // 尝试获取登录历史，如果表不存在则返回空数组
    try {
      const history = await (prisma as any).loginHistory.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return NextResponse.json({
        history,
      });
    } catch (e) {
      // 如果表不存在，返回空数组
      return NextResponse.json({
        history: [],
      });
    }
  } catch (error) {
    console.error('获取登录历史失败:', error);
    return NextResponse.json(
      { error: '获取登录历史失败' },
      { status: 500 }
    );
  }
}

// POST - 记录登录历史（由auth系统调用）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, ip, userAgent, device, location, status } = body;

    if (!userId) {
      return NextResponse.json(
        { error: '缺少用户ID' },
        { status: 400 }
      );
    }

    try {
      const history = await (prisma as any).loginHistory.create({
        data: {
          userId,
          ip: ip || null,
          userAgent: userAgent || null,
          device: device || null,
          location: location || null,
          status: status || 'SUCCESS',
        },
      });

      return NextResponse.json({
        success: true,
        history,
      });
    } catch (e) {
      // 如果表不存在，返回成功但不记录
      return NextResponse.json({
        success: true,
        message: 'Login history table not available',
      });
    }
  } catch (error) {
    console.error('记录登录历史失败:', error);
    return NextResponse.json(
      { error: '记录登录历史失败' },
      { status: 500 }
    );
  }
}
