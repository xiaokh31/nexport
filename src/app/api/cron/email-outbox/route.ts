import type { NextRequest } from "next/server";
import {
  requireCronRuntimeConfig,
  requireEmailRuntimeConfig,
  requireAuthRuntimeConfig,
} from "@/config/env/server";
import { processEmailOutbox } from "@/lib/notifications/outbox-worker";
import { handleEmailOutboxHttpRequest } from "@/lib/notifications/outbox-http";
import { PrismaEmailOutboxStore } from "@/lib/notifications/prisma-outbox-store";
import { ResendEmailSender } from "@/lib/notifications/resend-email-sender";
import { prisma } from "@/lib/prisma";
import { systemClock } from "@/lib/ports/external-services";

export const runtime = "nodejs";
export const maxDuration = 60;

async function processBatch(batchSize: number) {
  const emailConfig = requireEmailRuntimeConfig();
  const authConfig = requireAuthRuntimeConfig();
  return processEmailOutbox({
    store: new PrismaEmailOutboxStore(prisma),
    sender: new ResendEmailSender(
      emailConfig.apiKey,
      emailConfig.from,
      authConfig.secret,
    ),
    clock: systemClock,
    batchSize,
  });
}

export function handleRequest(request: NextRequest) {
  return handleEmailOutboxHttpRequest(request, {
    loadCronSecret: () => requireCronRuntimeConfig().secret,
    process: processBatch,
  });
}

export const GET = handleRequest;
export const POST = handleRequest;
