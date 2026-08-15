import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createEmailIdempotencyKey } from "@/lib/notifications/idempotency";
import {
  emailOutboxPayloadSchema,
  type EmailOutboxPayload,
} from "@/lib/notifications/outbox-payload";
import { normalizeNotificationLink } from "@/lib/notifications/link";
import { createQuoteNotificationContent } from "@/lib/notifications/quote-content";

const recipientSchema = z.string().trim().toLowerCase().email().max(254);
const eventKeySchema = z.string().trim().min(1).max(512);

interface EnqueueEmailInput {
  eventKey: string;
  recipient: string;
  payload: EmailOutboxPayload;
}

async function enqueueEmail(
  transaction: Prisma.TransactionClient,
  input: EnqueueEmailInput,
) {
  const recipient = recipientSchema.parse(input.recipient);
  const eventKey = eventKeySchema.parse(input.eventKey);
  const payload = emailOutboxPayloadSchema.parse(input.payload);
  return transaction.emailOutbox.create({
    data: {
      eventKey,
      recipient,
      idempotencyKey: createEmailIdempotencyKey(eventKey, recipient),
      payload,
    },
  });
}

/**
 * Required authentication/security mail deliberately has no preference input.
 * Callers still receive transactional outbox semantics without consulting
 * account marketing or quote-email switches.
 */
export async function enqueueRequiredEmail(
  transaction: Prisma.TransactionClient,
  input: {
    eventKey: string;
    recipient: string;
    from: string | null;
    subject: string;
    html: string;
  },
) {
  return enqueueEmail(transaction, {
    eventKey: input.eventKey,
    recipient: input.recipient,
    payload: {
      version: 1,
      kind: "REQUIRED_TRANSACTIONAL",
      from: input.from?.trim() || null,
      subject: input.subject,
      html: input.html,
    },
  });
}

/** Verification mail is required transactional mail and bypasses preferences. */
export async function enqueueEmailVerification(
  transaction: Prisma.TransactionClient,
  input: {
    eventKey: string;
    recipient: string;
    from: string | null | undefined;
    subject: string;
    verificationId: string;
    htmlTemplate: string;
  },
) {
  return enqueueEmail(transaction, {
    eventKey: input.eventKey,
    recipient: input.recipient,
    payload: {
      version: 1,
      kind: "EMAIL_VERIFICATION",
      from: input.from?.trim() || null,
      subject: input.subject,
      verificationId: input.verificationId,
      htmlTemplate: input.htmlTemplate,
    },
  });
}

export async function createQuoteEventNotifications(
  transaction: Prisma.TransactionClient,
  input: {
    eventId: string;
    userId: string | null;
    reference: string;
    status: string;
    amount: string | null;
    currency: string | null;
    emailFrom: string | null | undefined;
  },
): Promise<{ inAppCreated: boolean; emailQueued: boolean }> {
  if (!input.userId) {
    return { inAppCreated: false, emailQueued: false };
  }

  const user = await transaction.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      emailNotifications: true,
      quoteEmailUpdates: true,
      locale: true,
    },
  });
  if (!user) {
    throw new Error("NOTIFICATION_USER_NOT_FOUND");
  }

  const amountLabel = input.amount && input.currency
    ? `${input.amount} ${input.currency}`
    : undefined;
  const content = createQuoteNotificationContent({
    status: input.status,
    amountLabel,
    reference: input.reference,
    locale: user.locale,
  });
  const eventKey = `quote-event/${input.eventId}`;
  const link = normalizeNotificationLink(
    `/user/quotes?reference=${encodeURIComponent(input.reference)}`,
  );
  if (!link) throw new Error("INVALID_NOTIFICATION_LINK");

  await transaction.notification.create({
    data: {
      userId: user.id,
      eventKey,
      type: "QUOTE",
      title: content.title,
      content: content.content,
      link,
    },
  });

  const recipient = recipientSchema.safeParse(user.email);
  const emailAllowed = Boolean(
    user.emailVerified &&
    user.emailNotifications &&
    user.quoteEmailUpdates &&
    recipient.success,
  );
  if (!emailAllowed || !recipient.success) {
    return { inAppCreated: true, emailQueued: false };
  }

  await enqueueEmail(transaction, {
    eventKey,
    recipient: recipient.data,
    payload: {
      version: 1,
      kind: "QUOTE_STATUS",
      from: input.emailFrom?.trim() || null,
      subject: content.title,
      html: content.emailHtml,
    },
  });

  return { inAppCreated: true, emailQueued: true };
}
