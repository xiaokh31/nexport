// 用户设置 API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { locales } from '@/i18n';

interface UserSettings {
  emailNotifications?: boolean;
  quoteUpdates?: boolean;
  newsUpdates?: boolean;
  twoFactorEnabled?: boolean;
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
    });

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      settings: {
        emailNotifications: (user as any).emailNotifications ?? true,
        quoteUpdates: (user as any).quoteUpdates ?? true,
        newsUpdates: (user as any).newsUpdates ?? false,
        twoFactorEnabled: (user as any).twoFactorEnabled ?? false,
        locale: (user as any).locale ?? 'en',
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

    const body = await request.json();
    const { emailNotifications, quoteUpdates, newsUpdates, locale } = body;

    // 验证输入
    if (typeof emailNotifications !== 'boolean' && emailNotifications !== undefined) {
      return NextResponse.json(
        { error: '邮件通知设置必须为布尔值' },
        { status: 400 }
      );
    }
    if (typeof quoteUpdates !== 'boolean' && quoteUpdates !== undefined) {
      return NextResponse.json(
        { error: '报价更新设置必须为布尔值' },
        { status: 400 }
      );
    }
    if (typeof newsUpdates !== 'boolean' && newsUpdates !== undefined) {
      return NextResponse.json(
        { error: '新闻更新设置必须为布尔值' },
        { status: 400 }
      );
    }
    // 验证locale
    if (locale !== undefined && !locales.includes(locale)) {
      return NextResponse.json(
        { error: '无效的语言设置' },
        { status: 400 }
      );
    }

    // 构建更新数据
    const updateData: any = {};
    
    if (emailNotifications !== undefined) {
      updateData.emailNotifications = emailNotifications;
    }
    if (quoteUpdates !== undefined) {
      updateData.quoteUpdates = quoteUpdates;
    }
    if (newsUpdates !== undefined) {
      updateData.newsUpdates = newsUpdates;
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
    });

    return NextResponse.json({
      success: true,
      settings: {
        emailNotifications: (user as any).emailNotifications ?? true,
        quoteUpdates: (user as any).quoteUpdates ?? true,
        newsUpdates: (user as any).newsUpdates ?? false,
        locale: (user as any).locale ?? 'en',
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
