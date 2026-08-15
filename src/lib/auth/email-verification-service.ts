import type { Prisma, PrismaClient } from "@prisma/client";
import type { Clock, RandomByteSource } from "@/lib/ports/external-services";
import {
  createEmailVerificationChallenge,
  createEmailVerificationHtmlTemplate,
  getEmailVerificationSubject,
  inspectEmailVerificationToken,
  normalizeEmailVerificationLocale,
} from "@/lib/auth/email-verification-token";
import { enqueueEmailVerification } from "@/lib/notifications/domain";

const MINIMUM_REUSABLE_TOKEN_LIFETIME_MS = 15 * 60 * 1000;

export interface EmailVerificationDependencies {
  clock: Clock;
  randomBytes: RandomByteSource;
}

interface VerificationDeliveryConfig {
  secret: string;
  siteUrl: string;
  emailFrom: string | null | undefined;
}

function normalizedEmail(email: string) {
  return email.trim().toLowerCase();
}

export function emailVerificationEventKey(tokenHash: string) {
  return `email-verification/${tokenHash}`;
}

export async function issueEmailVerification(
  transaction: Prisma.TransactionClient,
  input: {
    email: string;
    locale: string | null | undefined;
    config: VerificationDeliveryConfig;
    dependencies: EmailVerificationDependencies;
  },
) {
  const email = normalizedEmail(input.email);
  const locale = normalizeEmailVerificationLocale(input.locale);
  const challenge = createEmailVerificationChallenge({
    secret: input.config.secret,
    randomBytes: input.dependencies.randomBytes,
    clock: input.dependencies.clock,
  });
  await transaction.verificationToken.create({
    data: {
      identifier: email,
      token: challenge.tokenHash,
      expires: challenge.expiresAt,
    },
  });
  const outbox = await enqueueEmailVerification(transaction, {
    eventKey: emailVerificationEventKey(challenge.tokenHash),
    recipient: email,
    from: input.config.emailFrom,
    subject: getEmailVerificationSubject(locale),
    verificationId: challenge.verificationId,
    htmlTemplate: createEmailVerificationHtmlTemplate({
      siteUrl: input.config.siteUrl,
      locale,
    }),
  });
  return { tokenHash: challenge.tokenHash, outboxId: outbox.id };
}

export type ConsumeEmailVerificationResult =
  | "VERIFIED"
  | "ALREADY_VERIFIED"
  | "EXPIRED"
  | "USED"
  | "INVALID";

export async function consumeEmailVerification(
  client: PrismaClient,
  input: { rawToken: string; secret: string; clock: Clock },
): Promise<ConsumeEmailVerificationResult> {
  const inspected = inspectEmailVerificationToken(input.rawToken, input.secret);
  if (!inspected) return "INVALID";
  const now = input.clock.now();

  return client.$transaction(async (transaction) => {
    const record = await transaction.verificationToken.findUnique({
      where: { token: inspected.tokenHash },
    });
    if (!record) return "INVALID";
    if (record.consumedAt) return "USED";
    if (record.expires <= now) return "EXPIRED";

    const user = await transaction.user.findUnique({
      where: { email: record.identifier },
      select: { id: true, emailVerified: true },
    });
    if (!user) return "INVALID";

    const claimed = await transaction.verificationToken.updateMany({
      where: {
        token: inspected.tokenHash,
        consumedAt: null,
        expires: { gt: now },
      },
      data: { consumedAt: now },
    });
    if (claimed.count === 0) {
      const current = await transaction.verificationToken.findUnique({
        where: { token: inspected.tokenHash },
        select: { consumedAt: true, expires: true },
      });
      if (current?.consumedAt) return "USED";
      if (current && current.expires <= now) return "EXPIRED";
      return "INVALID";
    }

    if (user.emailVerified) return "ALREADY_VERIFIED";
    const verified = await transaction.user.updateMany({
      where: { id: user.id, emailVerified: null },
      data: { emailVerified: now },
    });
    return verified.count === 1 ? "VERIFIED" : "ALREADY_VERIFIED";
  });
}

export type RequestEmailVerificationResult = "IGNORED" | "REUSED" | "QUEUED";

export async function requestEmailVerification(
  client: PrismaClient,
  input: {
    email: string;
    config: VerificationDeliveryConfig;
    dependencies: EmailVerificationDependencies;
  },
): Promise<RequestEmailVerificationResult> {
  const email = normalizedEmail(input.email);
  const now = input.dependencies.clock.now();

  return client.$transaction(async (transaction) => {
    const initialUser = await transaction.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!initialUser) return "IGNORED";

    await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "User" WHERE "id" = ${initialUser.id} FOR UPDATE
    `;
    const user = await transaction.user.findUnique({
      where: { id: initialUser.id },
      select: { email: true, emailVerified: true, locale: true },
    });
    if (!user || user.emailVerified) return "IGNORED";

    const openTokens = await transaction.verificationToken.findMany({
      where: { identifier: email, consumedAt: null },
      orderBy: { expires: "desc" },
      select: { token: true, expires: true },
    });
    const reusableToken = openTokens.find(
      (token) => token.expires.getTime() - now.getTime() >=
        MINIMUM_REUSABLE_TOKEN_LIFETIME_MS,
    );
    if (reusableToken) {
      const eventKey = emailVerificationEventKey(reusableToken.token);
      const outbox = await transaction.emailOutbox.findFirst({
        where: { eventKey, recipient: email },
        orderBy: { createdAt: "desc" },
      });
      if (outbox?.status === "PENDING") {
        await transaction.emailOutbox.updateMany({
          where: { id: outbox.id, status: "PENDING" },
          data: { nextAttemptAt: now },
        });
        return "REUSED";
      }
      if (outbox?.status === "PROCESSING") return "REUSED";
      if (outbox?.status === "FAILED" || outbox?.status === "MANUAL_REVIEW") {
        await transaction.emailOutbox.update({
          where: { id: outbox.id },
          data: {
            status: "PENDING",
            attemptCount: 0,
            nextAttemptAt: now,
            lockedAt: null,
            firstAttemptAt: null,
            sentAt: null,
            providerMessageId: null,
            lastError: null,
          },
        });
        return "REUSED";
      }
    }

    const oldEventKeys = openTokens.map((token) => emailVerificationEventKey(token.token));
    await transaction.verificationToken.updateMany({
      where: { identifier: email, consumedAt: null },
      data: { consumedAt: now },
    });
    if (oldEventKeys.length > 0) {
      await transaction.emailOutbox.updateMany({
        where: { eventKey: { in: oldEventKeys }, status: "PENDING" },
        data: {
          status: "FAILED",
          lastError: "SUPERSEDED_VERIFICATION_TOKEN",
        },
      });
    }

    await issueEmailVerification(transaction, {
      email: user.email,
      locale: user.locale,
      config: input.config,
      dependencies: input.dependencies,
    });
    return "QUEUED";
  });
}
