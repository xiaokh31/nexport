// 管理后台统计数据 API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - 获取统计数据
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '没有权限访问' },
        { status: 403 }
      );
    }

    // 获取今天的日期范围
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // 获取昨天的日期范围
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 并行获取各项统计数据
    const [
      // 总用户数
      totalUsers,
      // 今日新注册用户
      todayUsers,
      // 昨日新注册用户
      yesterdayUsers,
      // 总询价数
      totalQuotes,
      // 今日新询价
      todayQuotes,
      // 昨日新询价
      yesterdayQuotes,
      // 已发布文章数
      publishedArticles,
      // 今日新文章
      todayArticles,
      // 昨日新文章
      yesterdayArticles,
      // 未读消息数
      unreadMessages,
      // 今日消息数
      todayMessages,
      // 昨日消息数
      yesterdayMessages,
      // 最近询价列表
      recentQuotes,
      // 最近文章列表
      recentArticles,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
      prisma.user.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
      prisma.quote.count(),
      prisma.quote.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
      prisma.quote.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
      prisma.article.count({ where: { status: 'PUBLISHED' } }),
      prisma.article.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
      prisma.article.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
      prisma.contact.count({ where: { status: 'UNREAD' } }),
      prisma.contact.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
      prisma.contact.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
      prisma.quote.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          serviceType: true,
          createdAt: true,
        },
      }),
      prisma.article.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        where: { status: 'PUBLISHED' },
        select: {
          id: true,
          title: true,
          status: true,
          publishedAt: true,
          createdAt: true,
        },
      }),
    ]);

    // 计算变化
    const calculateChange = (today: number, yesterday: number) => {
      if (yesterday === 0) return today > 0 ? `+${today}` : '0';
      const diff = today - yesterday;
      return diff >= 0 ? `+${diff}` : `${diff}`;
    };

    return NextResponse.json({
      stats: {
        users: {
          total: totalUsers,
          today: todayUsers,
          change: calculateChange(todayUsers, yesterdayUsers),
        },
        quotes: {
          total: totalQuotes,
          today: todayQuotes,
          change: calculateChange(todayQuotes, yesterdayQuotes),
        },
        articles: {
          total: publishedArticles,
          today: todayArticles,
          change: calculateChange(todayArticles, yesterdayArticles),
        },
        messages: {
          total: unreadMessages,
          today: todayMessages,
          change: calculateChange(todayMessages, yesterdayMessages),
        },
      },
      recentQuotes,
      recentArticles,
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return NextResponse.json(
      { error: '获取统计数据失败' },
      { status: 500 }
    );
  }
}
