import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAuthRuntimeConfig } from "@/config/env/server";
import { EnvironmentConfigurationError } from "@/config/env/shared";
import { consumeEmailVerification } from "@/lib/auth/email-verification-service";
import { prisma } from "@/lib/prisma";
import { systemClock } from "@/lib/ports/external-services";
import { verifyEmailSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const input = verifyEmailSchema.parse(await request.json());
    const authConfig = requireAuthRuntimeConfig();
    const result = await consumeEmailVerification(prisma, {
      rawToken: input.token,
      secret: authConfig.secret,
      clock: systemClock,
    });

    if (result === "VERIFIED" || result === "ALREADY_VERIFIED") {
      return NextResponse.json({ success: true, status: result });
    }
    if (result === "EXPIRED") {
      return NextResponse.json(
        { success: false, status: result, error: "验证链接已过期" },
        { status: 410 },
      );
    }
    if (result === "USED") {
      return NextResponse.json(
        { success: false, status: result, error: "验证链接已使用" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { success: false, status: "INVALID", error: "验证链接无效" },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return NextResponse.json(
        { success: false, status: "INVALID", error: "验证请求无效" },
        { status: 400 },
      );
    }
    if (error instanceof EnvironmentConfigurationError) {
      console.error("Email verification configuration error", {
        message: error.message,
      });
      return NextResponse.json(
        { success: false, error: "邮箱验证服务暂不可用" },
        { status: 503 },
      );
    }
    console.error("Email verification failed", { error });
    return NextResponse.json(
      { success: false, error: "邮箱验证失败" },
      { status: 500 },
    );
  }
}
