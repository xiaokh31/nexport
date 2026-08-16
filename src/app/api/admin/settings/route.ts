// 系统设置 API
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCapability } from '@/lib/authorization';

const settingKeys = [
  'siteName',
  'siteUrl',
  'siteDescription',
  'contactEmail',
  'contactPhone',
  'contactAddress',
] as const;

// 未确认的公司资料保持为空，不以示例值伪装成已配置事实。
const defaultSettings = Object.fromEntries(
  settingKeys.map((key) => [key, '']),
) as Record<(typeof settingKeys)[number], string>;

// GET - 获取系统设置
export async function GET() {
  try {
    const authorization = await requireCapability('settings.manage');
    if (!authorization.authorized) return authorization.response;

    // 从数据库获取所有设置
    const settings = await prisma.setting.findMany();
    
    // 将设置转换为对象格式
    const settingsMap: Record<string, string> = {};
    settings.forEach(setting => {
      settingsMap[setting.key] = setting.value;
    });
    
    // 合并默认值和数据库中的值
    const mergedSettings = Object.fromEntries(
      settingKeys.map((key) => [key, settingsMap[key] ?? defaultSettings[key]]),
    );

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
    const authorization = await requireCapability('settings.manage');
    if (!authorization.authorized) return authorization.response;

    const body = await request.json();
    const { settings } = body as { settings?: Record<string, unknown> };
    
    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: '无效的设置数据' },
        { status: 400 }
      );
    }

    const entries = settingKeys.map((key) => [key, settings[key]] as const);
    if (entries.some(([, value]) => typeof value !== 'string' || value.length > 500)) {
      return NextResponse.json(
        { error: '设置字段必须是长度不超过500字符的文本' },
        { status: 400 },
      );
    }

    // 只更新界面实际支持的公开资料字段。
    const updates = entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value: value as string },
        create: { key, value: value as string },
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
