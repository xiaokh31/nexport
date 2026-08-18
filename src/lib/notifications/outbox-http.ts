import { createHash, timingSafeEqual } from "node:crypto";
import { EnvironmentConfigurationError } from "@/config/env/shared";
import { emailOutboxSchedulerContract } from "@/config/email-outbox-scheduler";
import type { EmailOutboxWorkerSummary } from "@/lib/notifications/outbox-worker";

type OutboxHttpDependencies = {
  loadCronSecret(): string;
  process(batchSize: number): Promise<EmailOutboxWorkerSummary>;
  logger?: Pick<Console, "error">;
};

function secretDigest(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

function hasValidBearer(request: Request, expectedSecret: string) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;
  const actualSecret = authorization.slice("Bearer ".length);
  return timingSafeEqual(secretDigest(actualSecret), secretDigest(expectedSecret));
}

export function parseEmailOutboxBatchSize(url: string): number | null {
  const rawValue = new URL(url).searchParams.get("limit");
  if (rawValue === null) return emailOutboxSchedulerContract.defaultBatchSize;
  if (!/^[1-9]\d*$/.test(rawValue)) return null;
  const batchSize = Number(rawValue);
  return Number.isSafeInteger(batchSize) &&
    batchSize <= emailOutboxSchedulerContract.maximumBatchSize
    ? batchSize
    : null;
}

function json(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function handleEmailOutboxHttpRequest(
  request: Request,
  dependencies: OutboxHttpDependencies,
) {
  const logger = dependencies.logger ?? console;
  let cronSecret: string;
  try {
    cronSecret = dependencies.loadCronSecret();
  } catch (error) {
    if (error instanceof EnvironmentConfigurationError) {
      logger.error("Email outbox worker configuration error", {
        message: error.message,
      });
      return json({ error: "Worker is not configured" }, 503);
    }
    throw error;
  }

  if (!hasValidBearer(request, cronSecret)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const batchSize = parseEmailOutboxBatchSize(request.url);
  if (batchSize === null) {
    return json({ error: "limit must be an integer from 1 to 100" }, 400);
  }

  try {
    const summary = await dependencies.process(batchSize);
    return json({ success: true, batchSize, summary }, 200);
  } catch (error) {
    if (error instanceof EnvironmentConfigurationError) {
      logger.error("Email outbox worker configuration error", {
        message: error.message,
      });
      return json({ error: "Worker is not configured" }, 503);
    }
    logger.error("Email outbox worker failed", { error });
    return json({ error: "Worker failed" }, 500);
  }
}
