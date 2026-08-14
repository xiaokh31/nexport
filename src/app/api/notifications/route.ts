// 消息通知 API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - 获取用户的消息通知
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
    const limit = parseInt(searchParams.get('limit') || '20');
    const unreadOnly = searchParams.get('unread') === 'true';

    const where = {
      userId: session.user.id,
      ...(unreadOnly && { isRead: false }),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: session.user.id, isRead: false },
      }),
    ]);

    return NextResponse.json({
      notifications,
      total,
      unreadCount,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('获取消息通知失败:', error);
    return NextResponse.json(
      { error: '获取消息通知失败' },
      { status: 500 }
    );
  }
}

// POST - 创建消息通知（管理员使用）
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    // 只有管理员可以创建通知
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '无权限' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, type, title, content, link, sendToAll } = body;

    if (!type || !title || !content) {
      return NextResponse.json(
        { error: '请填写完整信息' },
        { status: 400 }
      );
    }

    // 发送给所有用户
    if (sendToAll) {
      const users = await prisma.user.findMany({
        select: { id: true },
      });

      await prisma.notification.createMany({
        data: users.map(user => ({
          userId: user.id,
          type,
          title,
          content,
          link,
        })),
      });

      return NextResponse.json({
        success: true,
        message: `已发送给 ${users.length} 位用户`,
      });
    }

    // 发送给指定用户
    if (!userId) {
      return NextResponse.json(
        { error: '请指定接收用户' },
        { status: 400 }
      );
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        content,
        link,
      },
    });

    return NextResponse.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error('创建消息通知失败:', error);
    return NextResponse.json(
      { error: '创建消息通知失败' },
      { status: 500 }
    );
  }
}

// PATCH - 标记消息为已读
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { notificationId, markAll } = body;

    // 标记所有为已读
    if (markAll) {
      await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          isRead: false,
        },
        data: { isRead: true },
      });

      return NextResponse.json({
        success: true,
        message: '已全部标记为已读',
      });
    }

    // 标记单个为已读
    if (!notificationId) {
      return NextResponse.json(
        { error: '请指定消息ID' },
        { status: 400 }
      );
    }

    // 验证消息属于当前用户
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== session.user.id) {
      return NextResponse.json(
        { error: '消息不存在' },
        { status: 404 }
      );
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('标记消息失败:', error);
    return NextResponse.json(
      { error: '标记消息失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除消息
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json(
        { error: '请指定消息ID' },
        { status: 400 }
      );
    }

    // 验证消息属于当前用户
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== session.user.id) {
      return NextResponse.json(
        { error: '消息不存在' },
        { status: 404 }
      );
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('删除消息失败:', error);
    return NextResponse.json(
      { error: '删除消息失败' },
      { status: 500 }
    );
  }
}
