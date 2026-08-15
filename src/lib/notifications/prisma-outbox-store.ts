import type { EmailOutbox, Prisma, PrismaClient } from "@prisma/client";
import type {
  ClaimedEmailOutbox,
  EmailOutboxStore,
} from "@/lib/notifications/outbox-worker";

function toClaimed(
  record: EmailOutbox,
  lockedAt: Date,
  recoveredFromExpiredLease: boolean,
): ClaimedEmailOutbox {
  return {
    id: record.id,
    eventKey: record.eventKey,
    recipient: record.recipient,
    payload: record.payload,
    idempotencyKey: record.idempotencyKey,
    attemptCount: record.attemptCount + 1,
    firstAttemptAt: record.firstAttemptAt ?? lockedAt,
    lockedAt,
    lastError: record.lastError,
    recoveredFromExpiredLease,
  };
}

export class PrismaEmailOutboxStore implements EmailOutboxStore {
  constructor(private readonly client: PrismaClient) {}

  async claimBatch(input: { now: Date; leaseMs: number; limit: number }) {
    const leaseExpiredAt = new Date(input.now.getTime() - input.leaseMs);
    const eligible: Prisma.EmailOutboxWhereInput = {
      OR: [
        { status: "PENDING" as const, nextAttemptAt: { lte: input.now } },
        {
          status: "PROCESSING" as const,
          OR: [
            { lockedAt: { lte: leaseExpiredAt } },
            { lockedAt: null },
          ],
        },
      ],
    };
    const candidates = await this.client.emailOutbox.findMany({
      where: eligible,
      orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
      take: input.limit,
    });
    const claimed: ClaimedEmailOutbox[] = [];

    for (const candidate of candidates) {
      const lockToken = new Date(input.now);
      const result = await this.client.emailOutbox.updateMany({
        where: { id: candidate.id, ...eligible },
        data: {
          status: "PROCESSING",
          lockedAt: lockToken,
          firstAttemptAt: candidate.firstAttemptAt ?? lockToken,
          attemptCount: { increment: 1 },
        },
      });
      if (result.count === 1) {
        claimed.push(toClaimed(
          candidate,
          lockToken,
          candidate.status === "PROCESSING",
        ));
      }
    }

    return claimed;
  }

  async markSent(input: {
    id: string;
    lockedAt: Date;
    sentAt: Date;
    providerMessageId: string;
  }) {
    const result = await this.client.emailOutbox.updateMany({
      where: { id: input.id, status: "PROCESSING", lockedAt: input.lockedAt },
      data: {
        status: "SENT",
        lockedAt: null,
        sentAt: input.sentAt,
        providerMessageId: input.providerMessageId,
        lastError: null,
      },
    });
    return result.count === 1;
  }

  async markRetry(input: {
    id: string;
    lockedAt: Date;
    nextAttemptAt: Date;
    lastError: string;
  }) {
    const result = await this.client.emailOutbox.updateMany({
      where: { id: input.id, status: "PROCESSING", lockedAt: input.lockedAt },
      data: {
        status: "PENDING",
        lockedAt: null,
        nextAttemptAt: input.nextAttemptAt,
        lastError: input.lastError,
      },
    });
    return result.count === 1;
  }

  async markFailed(input: { id: string; lockedAt: Date; lastError: string }) {
    const result = await this.client.emailOutbox.updateMany({
      where: { id: input.id, status: "PROCESSING", lockedAt: input.lockedAt },
      data: { status: "FAILED", lockedAt: null, lastError: input.lastError },
    });
    return result.count === 1;
  }

  async markManualReview(input: {
    id: string;
    lockedAt: Date;
    lastError: string;
  }) {
    const result = await this.client.emailOutbox.updateMany({
      where: { id: input.id, status: "PROCESSING", lockedAt: input.lockedAt },
      data: {
        status: "MANUAL_REVIEW",
        lockedAt: null,
        lastError: input.lastError,
      },
    });
    return result.count === 1;
  }
}
