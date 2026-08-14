// 用户设置 API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { locales, type Locale } from '@/i18n';
import { Prisma } from '@prisma/client';

interface UserSettings {
  emailNotifications?: boolean;
  quoteEmailUpdates?: boolean;
  locale?: string;
}

// GET - 获取用户设置
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        emailNotifications: true,
        quoteEmailUpdates: true,
        locale: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      settings: {
        emailNotifications: user.emailNotifications,
        quoteEmailUpdates: user.quoteEmailUpdates,
        locale: user.locale,
      },
    });
  } catch (error) {
    console.error('获取用户设置失败:', error);
    return NextResponse.json(
      { error: '获取用户设置失败' },
      { status: 500 }
    );
  }
}

// PATCH - 更新用户设置
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const body = await request.json() as UserSettings;
    const { emailNotifications, quoteEmailUpdates, locale } = body;

    // 验证输入
    if (typeof emailNotifications !== 'boolean' && emailNotifications !== undefined) {
      return NextResponse.json(
        { error: '邮件通知设置必须为布尔值' },
        { status: 400 }
      );
    }
    if (typeof quoteEmailUpdates !== 'boolean' && quoteEmailUpdates !== undefined) {
      return NextResponse.json(
        { error: '报价更新设置必须为布尔值' },
        { status: 400 }
      );
    }
    // 验证locale
    if (locale !== undefined && !locales.includes(locale as Locale)) {
      return NextResponse.json(
        { error: '无效的语言设置' },
        { status: 400 }
      );
    }

    // 构建更新数据
    const updateData: Prisma.UserUpdateInput = {};
    
    if (emailNotifications !== undefined) {
      updateData.emailNotifications = emailNotifications;
    }
    if (quoteEmailUpdates !== undefined) {
      updateData.quoteEmailUpdates = quoteEmailUpdates;
    }
    if (locale !== undefined) {
      updateData.locale = locale;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        error: '没有需要更新的字段'
      }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        emailNotifications: true,
        quoteEmailUpdates: true,
        locale: true,
      },
    });

    return NextResponse.json({
      success: true,
      settings: {
        emailNotifications: user.emailNotifications,
        quoteEmailUpdates: user.quoteEmailUpdates,
        locale: user.locale,
      },
    });
  } catch (error) {
    console.error('更新用户设置失败:', error);
    return NextResponse.json(
      { error: '更新用户设置失败' },
      { status: 500 }
    );
  }
}
