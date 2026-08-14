import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { QuoteStatus, Prisma } from '@prisma/client';
import { getDictionary, Locale, locales, defaultLocale } from '@/i18n';

/**
 * 根据locale获取通知内容
 * 使用项目统一的i18n系统从 /src/i18n/locales/{locale}.json 读取翻译
 */
function getNotificationContent(status: string, quotedPrice?: string, locale: string = 'en') {
  // 验证locale是否有效
  const validLocale: Locale = locales.includes(locale as Locale) ? (locale as Locale) : defaultLocale;
  const dictionary = getDictionary(validLocale);
  const t = dictionary.notifications;
  const statusLabels = t.statusLabels as Record<string, string>;
  const statusLabel = statusLabels[status] || status;
  
  let title = t.quoteStatusUpdated;
  let content = t.quoteStatusUpdatedContent.replace('{status}', statusLabel);

  if (status === 'QUOTED') {
    title = t.yourQuoteHasBeenQuoted;
    content = t.quoteAmountProvided.replace('{price}', quotedPrice || statusLabels['QUOTED'] || status);
  } else if (status === 'ACCEPTED') {
    title = t.quoteAccepted;
    content = t.quoteAcceptedContent;
  } else if (status === 'REJECTED') {
    title = t.quoteRejected;
    content = t.quoteRejectedContent;
  }

  return { title, content };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No permission' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: Prisma.QuoteWhereInput = {};
    
    if (status && status !== 'all' && Object.values(QuoteStatus).includes(status as QuoteStatus)) {
      where.status = status as QuoteStatus;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
      ];
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
    console.error('Get quotes failed:', error);
    return NextResponse.json(
      { error: 'Failed to get quotes' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'STAFF') {
      return NextResponse.json(
        { error: 'No permission' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, status, quotedPrice, quoteNote } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Quote ID required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (status && Object.values(QuoteStatus).includes(status as QuoteStatus)) {
      updateData.status = status as QuoteStatus;
    }

    if (quotedPrice !== undefined) {
      updateData.quotedPrice = quotedPrice;
      updateData.quotedAt = new Date();
    }
    if (quoteNote !== undefined) {
      updateData.quoteNote = quoteNote;
    }

    const quote = await prisma.quote.update({
      where: { id },
      data: updateData as Prisma.QuoteUpdateInput,
    });

    // Send notification when status changes
    if (status && quote.userId) {
      try {
        // Get user's locale preference for multilingual notifications
        const user = (await prisma.user.findUnique({
          where: { id: quote.userId },
        })) as any;
        
        // Use user's locale preference, default to 'en' if not found
        const userLocale = (user?.locale as string) || 'en';
        const notif = getNotificationContent(status, quotedPrice, userLocale);
        
        await prisma.notification.create({
          data: {
            userId: quote.userId,
            type: 'QUOTE',
            title: notif.title,
            content: notif.content,
            link: '/user/quotes',
          },
        });
      } catch (err) {
        console.error('Failed to create notification:', err);
      }
    }

    return NextResponse.json({
      success: true,
      quote,
    });
  } catch (error) {
    console.error('Update quote failed:', error);
    return NextResponse.json(
      { error: 'Failed to update quote' },
      { status: 500 }
    );
  }
}
