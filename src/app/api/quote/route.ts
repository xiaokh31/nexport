import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";
import { quoteFormSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { EnvironmentConfigurationError } from "@/config/env/shared";
import {
  cryptoRandomByteSource,
  systemClock,
} from "@/lib/ports/external-services";
import { createQuoteReferenceGenerator } from "@/lib/quote/reference";
import { submitQuote } from "@/lib/quote/submission";
import { createServerProtection } from "@/lib/security/server-protection";
import {
  clientIpRateLimitSubject,
  emailRateLimitSubject,
  RATE_LIMIT_POLICIES,
} from "@/lib/security/rate-limit";

const quoteReferenceGenerator = createQuoteReferenceGenerator({
  clock: systemClock,
  randomBytes: cryptoRandomByteSource,
});

function successResponse(reference: string, status: string, httpStatus: number) {
  return NextResponse.json(
    { success: true, data: { reference, status } },
    { status: httpStatus },
  );
}

function errorResponse(
  requestId: string,
  status: number,
  code: string,
  message: string,
  fieldErrors?: Record<string, string[] | undefined>,
  retryAfterSeconds?: number,
) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) },
      requestId,
    },
    {
      status,
      ...(retryAfterSeconds
        ? { headers: { "Retry-After": String(retryAfterSeconds) } }
        : {}),
    },
  );
}

export async function POST(request: Request) {
  const requestId = randomUUID();

  try {
    const validatedData = quoteFormSchema.parse(await request.json());
    const protection = createServerProtection(request.headers);

    let limits;
    try {
      limits = await Promise.all([
        protection.rateLimiter.consume(
          RATE_LIMIT_POLICIES.quoteByIp,
          [clientIpRateLimitSubject(protection.clientIp)],
        ),
        protection.rateLimiter.consume(
          RATE_LIMIT_POLICIES.quoteByEmail,
          [emailRateLimitSubject(validatedData.email)],
        ),
      ]);
    } catch (error) {
      console.error("Quote rate limiter unavailable", { requestId, error });
      return errorResponse(
        requestId,
        503,
        "SECURITY_UNAVAILABLE",
        "安全验证服务未配置或暂不可用",
      );
    }

    const deniedLimit = limits.find((limit) => !limit.allowed);
    if (deniedLimit && !deniedLimit.allowed) {
      return errorResponse(
        requestId,
        429,
        "RATE_LIMITED",
        "询价提交过于频繁，请稍后再试",
        undefined,
        deniedLimit.retryAfterSeconds,
      );
    }

    const captchaResult = await protection.captchaVerifier.verify({
      token: validatedData.captchaToken || "",
      ...(protection.clientIp ? { remoteIp: protection.clientIp } : {}),
    });
    if (!captchaResult.success) {
      if (captchaResult.reason === "MISSING") {
        return errorResponse(
          requestId,
          400,
          "CAPTCHA_REQUIRED",
          "请先完成人机验证",
        );
      }
      if (
        captchaResult.reason === "TIMEOUT" ||
        captchaResult.reason === "UNAVAILABLE"
      ) {
        return errorResponse(
          requestId,
          503,
          "SECURITY_UNAVAILABLE",
          "安全验证服务未配置或暂不可用",
        );
      }
      return errorResponse(
        requestId,
        400,
        "CAPTCHA_REJECTED",
        "人机验证失败，请重新验证",
      );
    }

    const session = await getServerSession(authOptions);
    const result = await submitQuote(prisma, {
      data: validatedData,
      sessionUserId: session?.user?.id,
      referenceGenerator: quoteReferenceGenerator,
    });

    if (result.outcome === "SUBMISSION_KEY_CONFLICT") {
      return errorResponse(
        requestId,
        409,
        "SUBMISSION_KEY_CONFLICT",
        "该提交标识已用于不同的询价内容",
      );
    }
    if (result.outcome === "REFERENCE_UNAVAILABLE") {
      return errorResponse(
        requestId,
        503,
        "REFERENCE_UNAVAILABLE",
        "暂时无法生成询价编号，请重试",
      );
    }
    return successResponse(
      result.reference,
      result.status,
      result.outcome === "CREATED" ? 201 : 200,
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse(
        requestId,
        400,
        "INVALID_JSON",
        "请求内容不是有效的JSON",
      );
    }
    if (error instanceof ZodError) {
      return errorResponse(
        requestId,
        400,
        "VALIDATION_ERROR",
        "询价数据校验失败",
        error.flatten().fieldErrors,
      );
    }
    if (error instanceof EnvironmentConfigurationError) {
      console.error("Quote security configuration error", {
        requestId,
        message: error.message,
      });
      return errorResponse(
        requestId,
        503,
        "SECURITY_UNAVAILABLE",
        "安全验证服务未配置或暂不可用",
      );
    }

    console.error("Error processing quote", { requestId, error });
    return errorResponse(
      requestId,
      500,
      "INTERNAL_ERROR",
      "提交失败，请稍后重试",
    );
  }
}
