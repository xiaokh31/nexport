import { Prisma, type PrismaClient } from "@prisma/client";
import type { z } from "zod";
import {
  createBroadcastFingerprint,
  type BroadcastFingerprintInput,
} from "@/lib/notifications/idempotency";
import { notificationBroadcastSchema } from "@/lib/notifications/validation";

export class BroadcastRequestConflictError extends Error {
  constructor() {
    super("BROADCAST_REQUEST_KEY_CONFLICT");
  }
}

export class BroadcastTargetNotFoundError extends Error {
  constructor() {
    super("BROADCAST_TARGET_NOT_FOUND");
  }
}

type BroadcastInput = z.infer<typeof notificationBroadcastSchema>;

interface BroadcastResult {
  broadcastId: string;
  recipientCount: number;
  replayed: boolean;
}

function canonicalBroadcast(input: BroadcastInput): BroadcastFingerprintInput {
  return {
    targetScope: input.sendToAll ? "ALL_USERS" : "USER",
    targetUserId: input.sendToAll ? null : input.userId || null,
    type: input.type,
    title: input.title,
    content: input.content,
    link: input.link || null,
  };
}

async function replayExisting(
  client: PrismaClient | Prisma.TransactionClient,
  requestKey: string,
  fingerprint: string,
): Promise<BroadcastResult | null> {
  const existing = await client.notificationBroadcast.findUnique({
    where: { requestKey },
    select: { id: true, payloadFingerprint: true, recipientCount: true },
  });
  if (!existing) return null;
  if (existing.payloadFingerprint !== fingerprint) {
    throw new BroadcastRequestConflictError();
  }

  return {
    broadcastId: existing.id,
    recipientCount: existing.recipientCount,
    replayed: true,
  };
}

export async function broadcastNotifications(
  client: PrismaClient,
  actorId: string,
  input: BroadcastInput,
): Promise<BroadcastResult> {
  const validated = notificationBroadcastSchema.parse(input);
  const canonical = canonicalBroadcast(validated);
  const fingerprint = createBroadcastFingerprint(canonical);
  const replay = await replayExisting(client, validated.requestKey, fingerprint);
  if (replay) return replay;

  try {
    return await client.$transaction(async (transaction) => {
      const transactionReplay = await replayExisting(transaction, validated.requestKey, fingerprint);
      if (transactionReplay) return transactionReplay;

      let recipients: Array<{ id: string }>;
      if (canonical.targetScope === "ALL_USERS") {
        recipients = await transaction.user.findMany({ select: { id: true } });
      } else {
        const target = canonical.targetUserId && await transaction.user.findUnique({
          where: { id: canonical.targetUserId },
          select: { id: true },
        });
        if (!target) throw new BroadcastTargetNotFoundError();
        recipients = [target];
      }

      const broadcast = await transaction.notificationBroadcast.create({
        data: {
          requestKey: validated.requestKey,
          payloadFingerprint: fingerprint,
          actorId,
          targetScope: canonical.targetScope,
          targetUserId: canonical.targetUserId,
          type: validated.type,
          title: validated.title,
          content: validated.content,
          link: canonical.link,
          recipientCount: recipients.length,
        },
        select: { id: true },
      });
      const eventKey = `broadcast/${broadcast.id}`;

      if (recipients.length > 0) {
        await transaction.notification.createMany({
          data: recipients.map((recipient) => ({
            userId: recipient.id,
            eventKey,
            type: validated.type,
            title: validated.title,
            content: validated.content,
            link: canonical.link,
          })),
          skipDuplicates: true,
        });
      }

      return {
        broadcastId: broadcast.id,
        recipientCount: recipients.length,
        replayed: false,
      };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const concurrentReplay = await replayExisting(client, validated.requestKey, fingerprint);
      if (concurrentReplay) return concurrentReplay;
    }
    throw error;
  }
}
