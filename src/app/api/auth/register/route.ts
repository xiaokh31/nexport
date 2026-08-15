import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import { registerFormSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { EnvironmentConfigurationError } from "@/config/env/shared";
import { createServerProtection } from "@/lib/security/server-protection";
import {
  clientIpRateLimitSubject,
  RATE_LIMIT_POLICIES,
} from "@/lib/security/rate-limit";

function errorResponse(error: string, status: number, retryAfterSeconds?: number) {
  return NextResponse.json(
    { success: false, error },
    {
      status,
      ...(retryAfterSeconds
        ? { headers: { "Retry-After": String(retryAfterSeconds) } }
        : {}),
    },
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 验证表单数据
    const validatedData = registerFormSchema.parse(body);

    const protection = createServerProtection(request.headers);
    let rateLimitResult;
    try {
      rateLimitResult = await protection.rateLimiter.consume(
        RATE_LIMIT_POLICIES.registration,
        [clientIpRateLimitSubject(protection.clientIp)],
      );
    } catch (error) {
      console.error("Registration rate limiter unavailable:", error);
      return errorResponse("安全验证服务未配置或暂不可用", 503);
    }
    if (!rateLimitResult.allowed) {
      return errorResponse(
        "注册请求过于频繁，请稍后再试",
        429,
        rateLimitResult.retryAfterSeconds,
      );
    }

    const captchaResult = await protection.captchaVerifier.verify({
      token: validatedData.captchaToken || "",
      ...(protection.clientIp ? { remoteIp: protection.clientIp } : {}),
    });
    if (!captchaResult.success) {
      if (captchaResult.reason === "MISSING") {
        return errorResponse("请先完成人机验证", 400);
      }
      if (captchaResult.reason === "TIMEOUT" || captchaResult.reason === "UNAVAILABLE") {
        return errorResponse("安全验证服务未配置或暂不可用", 503);
      }
      return errorResponse("人机验证失败，请重新验证", 400);
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "该邮箱已被注册" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // 创建用户
    await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        company: validatedData.company || null,
        phone: validatedData.phone || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "注册成功",
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse("请求内容不是有效的JSON", 400);
    }
    if (error instanceof ZodError) {
      return errorResponse("注册数据校验失败", 400);
    }
    if (error instanceof EnvironmentConfigurationError) {
      console.error("Registration security configuration error:", error.message);
      return errorResponse("安全验证服务未配置或暂不可用", 503);
    }

    console.error("Error registering user:", error);
    return errorResponse("注册失败，请稍后重试", 500);
  }
}
