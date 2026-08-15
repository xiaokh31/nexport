import {
  Prisma,
  type PrismaClient,
  type Quote,
  type QuoteStatus as PrismaQuoteStatus,
} from "@prisma/client";
import type { Clock } from "@/lib/ports/external-services";
import type { QuoteStatus } from "@/config/quote";
import type {
  QuoteAdminUpdateValues,
  QuoteSoftDeleteValues,
} from "@/lib/validations";
import { createQuoteEventNotifications } from "@/lib/notifications/domain";
import {
  canEditQuoteCustomerNote,
  canEditQuoteInternalNote,
  canEditQuotePricing,
  canTransitionQuote,
  quoteTransitionRequiresReason,
  type QuoteActorRole,
} from "@/lib/quote/workflow";

export type QuoteWorkflowErrorCode =
  | "QUOTE_NOT_FOUND"
  | "REQUEST_KEY_CONFLICT"
  | "PRICING_FORBIDDEN"
  | "CUSTOMER_NOTE_FORBIDDEN"
  | "INTERNAL_NOTE_FORBIDDEN"
  | "INVALID_TRANSITION"
  | "REASON_REQUIRED"
  | "AMOUNT_CURRENCY_PAIR_REQUIRED"
  | "QUOTE_PRICE_REQUIRED"
  | "DELETE_NOT_ALLOWED";

export class QuoteWorkflowError extends Error {
  constructor(readonly code: QuoteWorkflowErrorCode) {
    super(code);
    this.name = "QuoteWorkflowError";
  }
}

async function lockActiveQuote(
  transaction: Prisma.TransactionClient,
  quoteId: string,
): Promise<Quote> {
  const locked = await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "Quote"
    WHERE "id" = ${quoteId} AND "deletedAt" IS NULL
    FOR UPDATE
  `;
  if (locked.length === 0) {
    throw new QuoteWorkflowError("QUOTE_NOT_FOUND");
  }
  const quote = await transaction.quote.findUnique({ where: { id: quoteId } });
  if (!quote || quote.deletedAt) {
    throw new QuoteWorkflowError("QUOTE_NOT_FOUND");
  }
  return quote;
}

function validateRequestReplay(
  event: { quoteId: string; toStatus: PrismaQuoteStatus } | null,
  quoteId: string,
  targetStatus: QuoteStatus,
) {
  if (!event) return false;
  if (event.quoteId !== quoteId || event.toStatus !== targetStatus) {
    throw new QuoteWorkflowError("REQUEST_KEY_CONFLICT");
  }
  return true;
}

export async function updateQuoteWorkflow(
  client: PrismaClient,
  input: {
    actorId: string;
    actorRole: QuoteActorRole;
    update: QuoteAdminUpdateValues;
    emailFrom: string | null | undefined;
    clock: Clock;
  },
) {
  try {
    return await client.$transaction(async (transaction) => {
      const current = await lockActiveQuote(transaction, input.update.id);
      const currentStatus = current.status as QuoteStatus;
      const targetStatus = input.update.status || currentStatus;

      if (input.update.status) {
        const previousEvent = await transaction.quoteEvent.findUnique({
          where: { requestKey: input.update.requestKey },
          select: { quoteId: true, toStatus: true },
        });
        if (
          validateRequestReplay(
            previousEvent,
            input.update.id,
            input.update.status,
          )
        ) {
          return { quote: current, eventId: null, replayed: true };
        }
      }

      const statusChanged = targetStatus !== currentStatus;
      const pricingChanged =
        input.update.amount !== undefined || input.update.currency !== undefined;

      if (pricingChanged && !canEditQuotePricing(input.actorRole, currentStatus)) {
        throw new QuoteWorkflowError("PRICING_FORBIDDEN");
      }
      if (
        input.update.customerNote !== undefined &&
        !canEditQuoteCustomerNote(input.actorRole, currentStatus)
      ) {
        throw new QuoteWorkflowError("CUSTOMER_NOTE_FORBIDDEN");
      }
      if (
        input.update.internalNote !== undefined &&
        !canEditQuoteInternalNote(input.actorRole, currentStatus)
      ) {
        throw new QuoteWorkflowError("INTERNAL_NOTE_FORBIDDEN");
      }

      if (statusChanged) {
        if (!canTransitionQuote(input.actorRole, currentStatus, targetStatus)) {
          throw new QuoteWorkflowError("INVALID_TRANSITION");
        }
        if (
          quoteTransitionRequiresReason(currentStatus, targetStatus) &&
          (!input.update.reason || input.update.reason.length < 10)
        ) {
          throw new QuoteWorkflowError("REASON_REQUIRED");
        }
      }

      const nextAmount = input.update.amount !== undefined
        ? input.update.amount
        : current.amount?.toString() ?? null;
      const nextCurrency = input.update.currency !== undefined
        ? input.update.currency
        : current.currency;
      if (Boolean(nextAmount) !== Boolean(nextCurrency)) {
        throw new QuoteWorkflowError("AMOUNT_CURRENCY_PAIR_REQUIRED");
      }
      if (targetStatus === "QUOTED" && (!nextAmount || !nextCurrency)) {
        throw new QuoteWorkflowError("QUOTE_PRICE_REQUIRED");
      }

      const updateData: Prisma.QuoteUpdateInput = {};
      if (input.update.amount !== undefined) updateData.amount = input.update.amount;
      if (input.update.currency !== undefined) updateData.currency = input.update.currency;
      if (input.update.customerNote !== undefined) {
        updateData.customerNote = input.update.customerNote || null;
      }
      if (input.update.internalNote !== undefined) {
        updateData.internalNote = input.update.internalNote || null;
      }
      if (statusChanged) {
        updateData.status = targetStatus as PrismaQuoteStatus;
        if (targetStatus === "QUOTED") updateData.quotedAt = input.clock.now();
      }

      const updated = Object.keys(updateData).length
        ? await transaction.quote.update({
            where: { id: current.id },
            data: updateData,
          })
        : current;

      let eventId: string | null = null;
      if (statusChanged) {
        const event = await transaction.quoteEvent.create({
          data: {
            quoteId: current.id,
            actorId: input.actorId,
            fromStatus: current.status,
            toStatus: targetStatus as PrismaQuoteStatus,
            reason: input.update.reason || null,
            requestKey: input.update.requestKey,
          },
        });
        eventId = event.id;
        await createQuoteEventNotifications(transaction, {
          eventId: event.id,
          userId: updated.userId,
          reference: updated.reference,
          status: targetStatus,
          amount: updated.amount?.toString() ?? null,
          currency: updated.currency,
          emailFrom: input.emailFrom,
        });
      }

      return { quote: updated, eventId, replayed: false };
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      input.update.status
    ) {
      const previousEvent = await client.quoteEvent.findUnique({
        where: { requestKey: input.update.requestKey },
        select: { quoteId: true, toStatus: true },
      });
      if (
        validateRequestReplay(
          previousEvent,
          input.update.id,
          input.update.status,
        )
      ) {
        const quote = await client.quote.findFirst({
          where: { id: input.update.id, deletedAt: null },
        });
        if (quote) return { quote, eventId: null, replayed: true };
      }
      throw new QuoteWorkflowError("REQUEST_KEY_CONFLICT");
    }
    throw error;
  }
}

export async function softDeleteQuote(
  client: PrismaClient,
  input: {
    actorId: string;
    deletion: QuoteSoftDeleteValues;
    clock: Clock;
  },
) {
  return client.$transaction(async (transaction) => {
    const current = await lockActiveQuote(transaction, input.deletion.id);
    if (current.status !== "PENDING") {
      throw new QuoteWorkflowError("DELETE_NOT_ALLOWED");
    }
    const enteredProcessing = await transaction.quoteEvent.findFirst({
      where: { quoteId: current.id, toStatus: "PROCESSING" },
      select: { id: true },
    });
    if (enteredProcessing) {
      throw new QuoteWorkflowError("DELETE_NOT_ALLOWED");
    }

    await transaction.quote.update({
      where: { id: current.id },
      data: {
        deletedAt: input.clock.now(),
        deletedById: input.actorId,
        deleteReason: input.deletion.reason,
      },
    });
  });
}
