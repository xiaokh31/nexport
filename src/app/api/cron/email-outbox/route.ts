import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  requireCronRuntimeConfig,
  requireEmailRuntimeConfig,
} from "@/config/env/server";
import { EnvironmentConfigurationError } from "@/config/env/shared";
import { processEmailOutbox } from "@/lib/notifications/outbox-worker";
import { PrismaEmailOutboxStore } from "@/lib/notifications/prisma-outbox-store";
import { ResendEmailSender } from "@/lib/notifications/resend-email-sender";
import { prisma } from "@/lib/prisma";
import { systemClock } from "@/lib/ports/external-services";

export const runtime = "nodejs";

function secretDigest(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

function hasValidBearer(request: NextRequest, expectedSecret: string) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;
  const actualSecret = authorization.slice("Bearer ".length);
  return timingSafeEqual(secretDigest(actualSecret), secretDigest(expectedSecret));
}

export async function POST(request: NextRequest) {
  try {
    const cronConfig = requireCronRuntimeConfig();
    if (!hasValidBearer(request, cronConfig.secret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const emailConfig = requireEmailRuntimeConfig();
    const rawBatchSize = Number.parseInt(
      new URL(request.url).searchParams.get("limit") || "25",
      10,
    );
    const batchSize = Number.isSafeInteger(rawBatchSize)
      ? Math.max(1, Math.min(rawBatchSize, 100))
      : 25;
    const summary = await processEmailOutbox({
      store: new PrismaEmailOutboxStore(prisma),
      sender: new ResendEmailSender(emailConfig.apiKey, emailConfig.from),
      clock: systemClock,
      batchSize,
    });

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    if (error instanceof EnvironmentConfigurationError) {
      console.error("Email outbox worker configuration error", {
        message: error.message,
      });
      return NextResponse.json(
        { error: "Worker is not configured" },
        { status: 503 },
      );
    }
    console.error("Email outbox worker failed", { error });
    return NextResponse.json({ error: "Worker failed" }, { status: 500 });
  }
}
