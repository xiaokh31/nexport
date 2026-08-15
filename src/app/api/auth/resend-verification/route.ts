import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  requireAuthRuntimeConfig,
  requireSiteRuntimeConfig,
  serverEnv,
} from "@/config/env/server";
import { EnvironmentConfigurationError } from "@/config/env/shared";
import { requestEmailVerification } from "@/lib/auth/email-verification-service";
import { prisma } from "@/lib/prisma";
import {
  cryptoRandomByteSource,
  systemClock,
} from "@/lib/ports/external-services";
import {
  emailRateLimitSubject,
  RATE_LIMIT_POLICIES,
} from "@/lib/security/rate-limit";
import { createServerProtection } from "@/lib/security/server-protection";
import { resendEmailVerificationSchema } from "@/lib/validations";

const acceptedMessage = "如果该邮箱存在且尚未验证，我们会发送验证邮件";

export async function POST(request: Request) {
  try {
    const input = resendEmailVerificationSchema.parse(await request.json());
    const protection = createServerProtection(request.headers);
    const rateLimit = await protection.rateLimiter.consume(
      RATE_LIMIT_POLICIES.resendVerification,
      [emailRateLimitSubject(input.email)],
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "验证邮件请求过于频繁，请稍后再试" },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    const authConfig = requireAuthRuntimeConfig();
    const siteConfig = requireSiteRuntimeConfig();
    await requestEmailVerification(prisma, {
      email: input.email,
      config: {
        secret: authConfig.secret,
        siteUrl: siteConfig.siteUrl,
        emailFrom: serverEnv.emailFrom,
      },
      dependencies: {
        clock: systemClock,
        randomBytes: cryptoRandomByteSource,
      },
    });
    return NextResponse.json(
      { success: true, message: acceptedMessage },
      { status: 202 },
    );
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return NextResponse.json({ success: false, error: "请求数据无效" }, { status: 400 });
    }
    if (error instanceof EnvironmentConfigurationError) {
      console.error("Resend verification configuration error", {
        message: error.message,
      });
      return NextResponse.json(
        { success: false, error: "邮箱验证服务暂不可用" },
        { status: 503 },
      );
    }
    console.error("Resend verification failed", { error });
    return NextResponse.json(
      { success: false, error: "邮箱验证服务暂不可用" },
      { status: 503 },
    );
  }
}
