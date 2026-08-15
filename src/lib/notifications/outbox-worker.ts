import type {
  Clock,
  EmailDeliveryResult,
  EmailSender,
} from "@/lib/ports/external-services";
import { emailOutboxPayloadSchema } from "@/lib/notifications/outbox-payload";

export const EMAIL_OUTBOX_LEASE_MS = 5 * 60 * 1000;
export const EMAIL_PROVIDER_IDEMPOTENCY_WINDOW_MS = 24 * 60 * 60 * 1000;
export const EMAIL_OUTBOX_MAX_ATTEMPTS = 8;

const AMBIGUOUS_ERROR_PREFIX = "AMBIGUOUS:";

export interface ClaimedEmailOutbox {
  id: string;
  eventKey: string;
  recipient: string;
  payload: unknown;
  idempotencyKey: string;
  attemptCount: number;
  firstAttemptAt: Date;
  lockedAt: Date;
  lastError: string | null;
  recoveredFromExpiredLease: boolean;
}

export interface EmailOutboxStore {
  claimBatch(input: {
    now: Date;
    leaseMs: number;
    limit: number;
  }): Promise<ClaimedEmailOutbox[]>;
  markSent(input: {
    id: string;
    lockedAt: Date;
    sentAt: Date;
    providerMessageId: string;
  }): Promise<boolean>;
  markRetry(input: {
    id: string;
    lockedAt: Date;
    nextAttemptAt: Date;
    lastError: string;
  }): Promise<boolean>;
  markFailed(input: {
    id: string;
    lockedAt: Date;
    lastError: string;
  }): Promise<boolean>;
  markManualReview(input: {
    id: string;
    lockedAt: Date;
    lastError: string;
  }): Promise<boolean>;
}

export interface EmailOutboxWorkerSummary {
  claimed: number;
  sent: number;
  retried: number;
  failed: number;
  manualReview: number;
  staleCompletions: number;
}

type WorkerLogger = Pick<Console, "info" | "warn" | "error">;

function retryDelayMs(attemptCount: number) {
  const exponent = Math.max(0, Math.min(attemptCount - 1, 6));
  return Math.min(60 * 60 * 1000, 60 * 1000 * 2 ** exponent);
}

function errorLabel(result: Extract<EmailDeliveryResult, { success: false }>) {
  return `${result.reason}:${result.retryable ? "RETRYABLE" : "PERMANENT"}`;
}

function wasAmbiguous(record: ClaimedEmailOutbox) {
  return record.recoveredFromExpiredLease ||
    record.lastError?.startsWith(AMBIGUOUS_ERROR_PREFIX) === true;
}

export async function processEmailOutbox(input: {
  store: EmailOutboxStore;
  sender: EmailSender;
  clock: Clock;
  batchSize?: number;
  logger?: WorkerLogger;
}): Promise<EmailOutboxWorkerSummary> {
  const now = input.clock.now();
  const batchSize = Math.max(1, Math.min(input.batchSize ?? 25, 100));
  const logger = input.logger ?? console;
  const records = await input.store.claimBatch({
    now,
    leaseMs: EMAIL_OUTBOX_LEASE_MS,
    limit: batchSize,
  });
  const summary: EmailOutboxWorkerSummary = {
    claimed: records.length,
    sent: 0,
    retried: 0,
    failed: 0,
    manualReview: 0,
    staleCompletions: 0,
  };

  for (const record of records) {
    let ambiguous = wasAmbiguous(record);
    const idempotencyAgeMs = now.getTime() - record.firstAttemptAt.getTime();

    if (ambiguous && idempotencyAgeMs >= EMAIL_PROVIDER_IDEMPOTENCY_WINDOW_MS) {
      const updated = await input.store.markManualReview({
        id: record.id,
        lockedAt: record.lockedAt,
        lastError: `${AMBIGUOUS_ERROR_PREFIX}PROVIDER_WINDOW_EXPIRED`,
      });
      updated ? summary.manualReview++ : summary.staleCompletions++;
      logger.warn("email_outbox_manual_review", {
        outboxId: record.id,
        eventKey: record.eventKey,
        attemptCount: record.attemptCount,
      });
      continue;
    }

    const payload = emailOutboxPayloadSchema.safeParse(record.payload);
    if (!payload.success) {
      const updated = ambiguous
        ? await input.store.markManualReview({
          id: record.id,
          lockedAt: record.lockedAt,
          lastError: `${AMBIGUOUS_ERROR_PREFIX}INVALID_OUTBOX_PAYLOAD`,
        })
        : await input.store.markFailed({
          id: record.id,
          lockedAt: record.lockedAt,
          lastError: "INVALID_OUTBOX_PAYLOAD",
        });
      if (!updated) summary.staleCompletions++;
      else if (ambiguous) summary.manualReview++;
      else summary.failed++;
      logger.error("email_outbox_invalid_payload", {
        outboxId: record.id,
        eventKey: record.eventKey,
      });
      continue;
    }

    let result: EmailDeliveryResult;
    try {
      result = await input.sender.send({
        recipient: record.recipient,
        idempotencyKey: record.idempotencyKey,
        payload: payload.data,
      });
    } catch {
      result = {
        success: false,
        reason: "TIMEOUT",
        retryable: true,
        ambiguous: true,
      };
    }

    if (result.success) {
      const updated = await input.store.markSent({
        id: record.id,
        lockedAt: record.lockedAt,
        sentAt: input.clock.now(),
        providerMessageId: result.providerMessageId,
      });
      updated ? summary.sent++ : summary.staleCompletions++;
      logger.info("email_outbox_sent", {
        outboxId: record.id,
        eventKey: record.eventKey,
        attemptCount: record.attemptCount,
      });
      continue;
    }

    ambiguous ||= result.ambiguous;
    const lastError = ambiguous
      ? `${AMBIGUOUS_ERROR_PREFIX}${errorLabel(result)}`
      : errorLabel(result);
    const currentAgeMs = input.clock.now().getTime() - record.firstAttemptAt.getTime();

    if (ambiguous && currentAgeMs >= EMAIL_PROVIDER_IDEMPOTENCY_WINDOW_MS) {
      const updated = await input.store.markManualReview({
        id: record.id,
        lockedAt: record.lockedAt,
        lastError: `${AMBIGUOUS_ERROR_PREFIX}PROVIDER_WINDOW_EXPIRED`,
      });
      updated ? summary.manualReview++ : summary.staleCompletions++;
      continue;
    }

    if (!ambiguous && !result.retryable) {
      const updated = await input.store.markFailed({
        id: record.id,
        lockedAt: record.lockedAt,
        lastError,
      });
      updated ? summary.failed++ : summary.staleCompletions++;
      continue;
    }

    if (!ambiguous && record.attemptCount >= EMAIL_OUTBOX_MAX_ATTEMPTS) {
      const updated = await input.store.markFailed({
        id: record.id,
        lockedAt: record.lockedAt,
        lastError: `MAX_ATTEMPTS:${lastError}`,
      });
      updated ? summary.failed++ : summary.staleCompletions++;
      continue;
    }

    const updated = await input.store.markRetry({
      id: record.id,
      lockedAt: record.lockedAt,
      nextAttemptAt: new Date(
        input.clock.now().getTime() + retryDelayMs(record.attemptCount),
      ),
      lastError,
    });
    updated ? summary.retried++ : summary.staleCompletions++;
  }

  return summary;
}
