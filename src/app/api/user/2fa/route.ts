import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as QRCode from 'qrcode';

// ==================== QR码缓存机制 ====================
interface CacheEntry {
  secret: string;
  qrCode: string;
  createdAt: number;
  email: string;
}

// 内存缓存，用于存储2FA设置过程中的临时数据
const qrCodeCache = new Map<string, CacheEntry>();

// 缓存过期时间（5分钟）
const CACHE_EXPIRY = 5 * 60 * 1000;

// 清理过期缓存
function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, value] of qrCodeCache.entries()) {
    if (now - value.createdAt > CACHE_EXPIRY) {
      qrCodeCache.delete(key);
    }
  }
}

// ==================== 速率限制机制 ====================
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// IP/用户速率限制缓存
const rateLimitCache = new Map<string, RateLimitEntry>();

// 速率限制配置
const RATE_LIMIT_WINDOW = 60 * 1000; // 1分钟窗口
const MAX_REQUESTS_PER_WINDOW = 10; // 每分钟最多10次请求
const MAX_FAILED_ATTEMPTS = 5; // 最多5次失败尝试

// 检查速率限制
function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitCache.get(key);
  
  if (!entry || now > entry.resetAt) {
    // 重置或初始化
    rateLimitCache.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetIn: RATE_LIMIT_WINDOW };
  }
  
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }
  
  entry.count++;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - entry.count, resetIn: entry.resetAt - now };
}

// 记录失败尝试
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15分钟锁定

function checkFailedAttempts(userId: string): { locked: boolean; lockedUntil: number } {
  const entry = failedAttempts.get(userId);
  if (!entry) return { locked: false, lockedUntil: 0 };
  
  if (Date.now() < entry.lockedUntil) {
    return { locked: true, lockedUntil: entry.lockedUntil };
  }
  
  // 锁定时间已过，重置
  failedAttempts.delete(userId);
  return { locked: false, lockedUntil: 0 };
}

function recordFailedAttempt(userId: string): void {
  const entry = failedAttempts.get(userId) || { count: 0, lockedUntil: 0 };
  entry.count++;
  
  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_DURATION;
    console.warn(`[2FA Security] User ${userId} locked out due to ${entry.count} failed attempts`);
  }
  
  failedAttempts.set(userId, entry);
}

function clearFailedAttempts(userId: string): void {
  failedAttempts.delete(userId);
}

// ==================== 操作日志记录 ====================
interface TwoFALog {
  userId: string;
  action: 'setup_request' | 'enable' | 'disable' | 'verify_success' | 'verify_failed';
  ip?: string;
  userAgent?: string;
  timestamp: Date;
  success: boolean;
  details?: string;
}

// 内存日志（生产环境应存储到数据库）
const twoFALogs: TwoFALog[] = [];
const MAX_LOG_ENTRIES = 1000;

function logTwoFAOperation(log: TwoFALog): void {
  twoFALogs.unshift(log);
  
  // 限制日志条数
  if (twoFALogs.length > MAX_LOG_ENTRIES) {
    twoFALogs.pop();
  }
  
  // 输出到控制台
  console.log(`[2FA Audit] ${log.action} - User: ${log.userId}, Success: ${log.success}, IP: ${log.ip || 'unknown'}`);
}

// ==================== 工具函数 ====================
function generateSecret(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * 生成TOTP QR码数据URL
 * 格式: otpauth://totp/[label]?secret=[secret]&issuer=[issuer]
 */
async function generateQRCodeDataUrl(secret: string, email: string): Promise<string> {
  const issuer = encodeURIComponent(process.env.AUTH_2FA_ISSUER || 'Company Name');
  const otpauthUrl = `otpauth://totp/${issuer}:${email}?secret=${secret}&issuer=${issuer}`;
  try {
    const dataUrl = await QRCode.toDataURL(otpauthUrl);
    return dataUrl;
  } catch (err) {
    console.error('Failed to generate QR code:', err);
    return '';
  }
}

// 获取请求IP
function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.headers.get('x-real-ip') 
    || 'unknown';
}

export async function GET(request: NextRequest) {
  // 清理过期缓存
  cleanExpiredCache();
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = session.user.id;
    const ip = getClientIP(request);
    
    // 检查速率限制
    const rateLimit = checkRateLimit(`2fa_get_${userId}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: Math.ceil(rateLimit.resetIn / 1000) },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const enabled = (user as any).twoFactorEnabled || false;
    
    // 检查缓存中是否已有未过期的QR码数据
    const cacheKey = `2fa_${userId}`;
    let cacheEntry = qrCodeCache.get(cacheKey);
    
    if (cacheEntry && cacheEntry.email === user.email && Date.now() - cacheEntry.createdAt < CACHE_EXPIRY) {
      // 使用缓存的数据
      logTwoFAOperation({
        userId,
        action: 'setup_request',
        ip,
        timestamp: new Date(),
        success: true,
        details: 'Used cached QR code',
      });
      
      return NextResponse.json({ 
        enabled, 
        secret: cacheEntry.secret,
        qrCode: cacheEntry.qrCode,
        cached: true,
      });
    }
    
    // 生成新的密钥和QR码
    const secret = generateSecret();
    const qrCodeUrl = await generateQRCodeDataUrl(secret, user.email);
    
    // 存入缓存
    cacheEntry = {
      secret,
      qrCode: qrCodeUrl,
      createdAt: Date.now(),
      email: user.email,
    };
    qrCodeCache.set(cacheKey, cacheEntry);
    
    // 记录操作日志
    logTwoFAOperation({
      userId,
      action: 'setup_request',
      ip,
      timestamp: new Date(),
      success: true,
      details: 'Generated new QR code',
    });

    return NextResponse.json({ 
      enabled, 
      secret,
      qrCode: qrCodeUrl,
      cached: false,
    });
  } catch (error) {
    console.error('2FA get error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = session.user.id;
    const ip = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || undefined;
    
    // 检查速率限制
    const rateLimit = checkRateLimit(`2fa_post_${userId}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: Math.ceil(rateLimit.resetIn / 1000) },
        { status: 429 }
      );
    }
    
    // 检查账户是否被锁定
    const lockStatus = checkFailedAttempts(userId);
    if (lockStatus.locked) {
      const remainingMinutes = Math.ceil((lockStatus.lockedUntil - Date.now()) / 60000);
      return NextResponse.json(
        { error: `Account temporarily locked. Try again in ${remainingMinutes} minutes.` },
        { status: 423 }
      );
    }

    const body = await request.json();
    const { action, secret, token } = body;

    if (action === 'enable') {
      if (!secret || !token) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
      }

      if (!/^\d{6}$/.test(token)) {
        recordFailedAttempt(userId);
        logTwoFAOperation({
          userId,
          action: 'verify_failed',
          ip,
          userAgent,
          timestamp: new Date(),
          success: false,
          details: 'Invalid token format',
        });
        return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
      }

      // 验证secret是否与缓存中的匹配（防止篡改）
      const cacheKey = `2fa_${userId}`;
      const cacheEntry = qrCodeCache.get(cacheKey);
      if (!cacheEntry || cacheEntry.secret !== secret) {
        recordFailedAttempt(userId);
        logTwoFAOperation({
          userId,
          action: 'verify_failed',
          ip,
          userAgent,
          timestamp: new Date(),
          success: false,
          details: 'Secret mismatch or expired',
        });
        return NextResponse.json({ error: 'Invalid or expired setup. Please refresh and try again.' }, { status: 400 });
      }

      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          twoFactorEnabled: true,
          twoFactorSecret: secret,
        } as any,
      });
      
      // 清除缓存和失败记录
      qrCodeCache.delete(cacheKey);
      clearFailedAttempts(userId);
      
      // 记录成功操作
      logTwoFAOperation({
        userId,
        action: 'enable',
        ip,
        userAgent,
        timestamp: new Date(),
        success: true,
      });

      return NextResponse.json({ success: true, message: '2FA enabled' });
    } else if (action === 'disable') {
      if (!token) {
        return NextResponse.json({ error: 'Token required' }, { status: 400 });
      }

      if (!/^\d{6}$/.test(token)) {
        recordFailedAttempt(userId);
        logTwoFAOperation({
          userId,
          action: 'verify_failed',
          ip,
          userAgent,
          timestamp: new Date(),
          success: false,
          details: 'Invalid token format during disable',
        });
        return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
      }

      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
        } as any,
      });
      
      // 清除失败记录
      clearFailedAttempts(userId);
      
      // 记录成功操作
      logTwoFAOperation({
        userId,
        action: 'disable',
        ip,
        userAgent,
        timestamp: new Date(),
        success: true,
      });

      return NextResponse.json({ success: true, message: '2FA disabled' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('2FA error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
