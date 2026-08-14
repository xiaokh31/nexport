// 系统设置 API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// 默认设置值
const defaultSettings: Record<string, string> = {
  siteName: 'Company Name',
  siteUrl: 'https://example.com',
  siteDescription: '专业的跨境物流解决方案提供商',
  contactEmail: 'contact@example.com',
  contactPhone: '+1 (555) 000-0000',
  contactAddress: 'Address to be configured',
  sessionTimeout: '30',
  maxLoginAttempts: '5',
};

// GET - 获取系统设置
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '没有权限访问' },
        { status: 403 }
      );
    }

    // 从数据库获取所有设置
    const settings = await prisma.setting.findMany();
    
    // 将设置转换为对象格式
    const settingsMap: Record<string, string> = {};
    settings.forEach(setting => {
      settingsMap[setting.key] = setting.value;
    });
    
    // 合并默认值和数据库中的值
    const mergedSettings = { ...defaultSettings, ...settingsMap };

    return NextResponse.json({ settings: mergedSettings });
  } catch (error) {
    console.error('获取系统设置失败:', error);
    return NextResponse.json(
      { error: '获取系统设置失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新系统设置
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '没有权限访问' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { settings } = body;
    
    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: '无效的设置数据' },
        { status: 400 }
      );
    }

    // 使用事务更新所有设置
    const updates = Object.entries(settings).map(([key, value]) => 
      prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    );

    await prisma.$transaction(updates);

    return NextResponse.json({ 
      success: true,
      message: '设置已保存' 
    });
  } catch (error) {
    console.error('保存系统设置失败:', error);
    return NextResponse.json(
      { error: '保存系统设置失败' },
      { status: 500 }
    );
  }
}
