import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma, QuoteStatus } from "@prisma/client";
import { ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { quoteAdminUpdateSchema, quoteSoftDeleteSchema } from "@/lib/validations";
import { getDictionary, Locale, locales, defaultLocale } from "@/i18n";
import { QUOTE_STATUSES, type QuoteStatus as QuoteStatusValue } from "@/config/quote";

type QuoteActorRole = "ADMIN" | "STAFF" | "FINANCE";

const quoteRoles = new Set<QuoteActorRole>(["ADMIN", "STAFF", "FINANCE"]);

const transitionRoles: Record<QuoteStatusValue, Partial<Record<QuoteStatusValue, QuoteActorRole[]>>> = {
  PENDING: {
    PROCESSING: ["ADMIN", "STAFF"],
    CLOSED: ["ADMIN"],
  },
  PROCESSING: {
    PENDING: ["ADMIN"],
    QUOTED: ["ADMIN", "STAFF", "FINANCE"],
    CLOSED: ["ADMIN"],
  },
  QUOTED: {
    PROCESSING: ["ADMIN"],
    ACCEPTED: ["ADMIN"],
    REJECTED: ["ADMIN"],
    CLOSED: ["ADMIN"],
  },
  ACCEPTED: {
    QUOTED: ["ADMIN"],
    CLOSED: ["ADMIN"],
  },
  REJECTED: {
    QUOTED: ["ADMIN"],
    CLOSED: ["ADMIN"],
  },
  CLOSED: {},
};

function requiresTransitionReason(from: QuoteStatusValue, to: QuoteStatusValue) {
  return (
    (to === "CLOSED" && ["PENDING", "PROCESSING", "QUOTED"].includes(from)) ||
    (from === "PROCESSING" && to === "PENDING") ||
    (from === "QUOTED" && to === "PROCESSING") ||
    (["ACCEPTED", "REJECTED"].includes(from) && to === "QUOTED")
  );
}

function serializeQuote<
  T extends {
    amount: { toString(): string } | null;
    weightValue: { toString(): string } | null;
    length: { toString(): string } | null;
    width: { toString(): string } | null;
    height: { toString(): string } | null;
  },
>(quote: T) {
  return {
    ...quote,
    amount: quote.amount?.toString() ?? null,
    weightValue: quote.weightValue?.toString() ?? null,
    length: quote.length?.toString() ?? null,
    width: quote.width?.toString() ?? null,
    height: quote.height?.toString() ?? null,
  };
}

function getNotificationContent(status: string, amountLabel?: string, locale: string = "en") {
  const validLocale: Locale = locales.includes(locale as Locale) ? (locale as Locale) : defaultLocale;
  const dictionary = getDictionary(validLocale);
  const t = dictionary.notifications;
  const statusLabels = t.statusLabels as Record<string, string>;
  const statusLabel = statusLabels[status] || status;

  let title = t.quoteStatusUpdated;
  let content = t.quoteStatusUpdatedContent.replace("{status}", statusLabel);

  if (status === "QUOTED") {
    title = t.yourQuoteHasBeenQuoted;
    content = t.quoteAmountProvided.replace("{price}", amountLabel || statusLabel);
  } else if (status === "ACCEPTED") {
    title = t.quoteAccepted;
    content = t.quoteAcceptedContent;
  } else if (status === "REJECTED") {
    title = t.quoteRejected;
    content = t.quoteRejectedContent;
  }

  return { title, content };
}

function apiError(status: number, code: string, message: string, requestId = randomUUID()) {
  return NextResponse.json({ success: false, error: { code, message }, requestId }, { status });
}

function getActorRole(role: string | undefined): QuoteActorRole | null {
  return role && quoteRoles.has(role as QuoteActorRole) ? (role as QuoteActorRole) : null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const actorRole = getActorRole(session?.user?.role);

    if (!session?.user?.id) {
      return apiError(401, "UNAUTHENTICATED", "Not authenticated");
    }
    if (!actorRole) {
      return apiError(403, "FORBIDDEN", "No permission");
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("limit") || "10", 10)));
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.trim();
    const where: Prisma.QuoteWhereInput = { deletedAt: null };

    if (status && status !== "all") {
      if (!QUOTE_STATUSES.includes(status as QuoteStatusValue)) {
        return apiError(400, "INVALID_STATUS", "Unknown quote status");
      }
      where.status = status as QuoteStatus;
    }

    if (search) {
      where.OR = [
        { reference: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.quote.count({ where }),
    ]);

    return NextResponse.json({
      quotes: quotes.map(serializeQuote),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get quotes failed:", error);
    return apiError(500, "INTERNAL_ERROR", "Failed to get quotes");
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = randomUUID();

  try {
    const session = await getServerSession(authOptions);
    const actorRole = getActorRole(session?.user?.role);

    if (!session?.user?.id) {
      return apiError(401, "UNAUTHENTICATED", "Not authenticated", requestId);
    }
    if (!actorRole) {
      return apiError(403, "FORBIDDEN", "No permission", requestId);
    }
    const actorId = session.user.id;

    const input = quoteAdminUpdateSchema.parse(await request.json());

    if (input.status) {
      const previousEvent = await prisma.quoteEvent.findUnique({
        where: { requestKey: input.requestKey },
      });
      if (previousEvent) {
        if (previousEvent.quoteId !== input.id || previousEvent.toStatus !== input.status) {
          return apiError(409, "REQUEST_KEY_CONFLICT", "该请求标识已用于其他状态变更", requestId);
        }
        const previousResult = await prisma.quote.findFirst({
          where: { id: input.id, deletedAt: null },
        });
        return previousResult
          ? NextResponse.json({ success: true, quote: serializeQuote(previousResult) })
          : apiError(404, "QUOTE_NOT_FOUND", "询价不存在", requestId);
      }
    }

    try {
      const quote = await prisma.$transaction(async (tx) => {
        const current = await tx.quote.findFirst({
          where: { id: input.id, deletedAt: null },
        });

        if (!current) {
          throw new Error("QUOTE_NOT_FOUND");
        }

        const currentStatus = current.status as QuoteStatusValue;
        const targetStatus = input.status || currentStatus;
        const statusChanged = targetStatus !== currentStatus;
        const pricingChanged = input.amount !== undefined || input.currency !== undefined;

        if (pricingChanged && (currentStatus !== "PROCESSING" || !["ADMIN", "FINANCE"].includes(actorRole))) {
          throw new Error("PRICING_FORBIDDEN");
        }
        if (
          input.customerNote !== undefined &&
          (currentStatus !== "PROCESSING" || !["ADMIN", "STAFF", "FINANCE"].includes(actorRole))
        ) {
          throw new Error("CUSTOMER_NOTE_FORBIDDEN");
        }
        if (
          input.internalNote !== undefined &&
          (currentStatus === "CLOSED" || !["ADMIN", "STAFF"].includes(actorRole))
        ) {
          throw new Error("INTERNAL_NOTE_FORBIDDEN");
        }

        if (statusChanged) {
          const allowedRoles = transitionRoles[currentStatus][targetStatus] || [];
          if (!allowedRoles.includes(actorRole)) {
            throw new Error("INVALID_TRANSITION");
          }
          if (requiresTransitionReason(currentStatus, targetStatus) && (!input.reason || input.reason.length < 10)) {
            throw new Error("REASON_REQUIRED");
          }
        }

        const nextAmount = input.amount !== undefined ? input.amount : current.amount?.toString() ?? null;
        const nextCurrency = input.currency !== undefined ? input.currency : current.currency;

        if (Boolean(nextAmount) !== Boolean(nextCurrency)) {
          throw new Error("AMOUNT_CURRENCY_PAIR_REQUIRED");
        }
        if (targetStatus === "QUOTED" && (!nextAmount || !nextCurrency)) {
          throw new Error("QUOTE_PRICE_REQUIRED");
        }

        const updateData: Prisma.QuoteUpdateInput = {};
        if (input.amount !== undefined) updateData.amount = input.amount;
        if (input.currency !== undefined) updateData.currency = input.currency;
        if (input.customerNote !== undefined) updateData.customerNote = input.customerNote || null;
        if (input.internalNote !== undefined) updateData.internalNote = input.internalNote || null;
        if (statusChanged) {
          updateData.status = targetStatus as QuoteStatus;
          if (targetStatus === "QUOTED") updateData.quotedAt = new Date();
        }

        const updated = Object.keys(updateData).length
          ? await tx.quote.update({ where: { id: current.id }, data: updateData })
          : current;

        if (statusChanged) {
          const event = await tx.quoteEvent.create({
            data: {
              quoteId: current.id,
              actorId,
              fromStatus: current.status,
              toStatus: targetStatus as QuoteStatus,
              reason: input.reason || null,
              requestKey: input.requestKey,
            },
          });

          if (updated.userId) {
            const user = await tx.user.findUnique({
              where: { id: updated.userId },
              select: { locale: true },
            });
            const amountLabel = updated.amount && updated.currency
              ? `${updated.amount.toString()} ${updated.currency}`
              : undefined;
            const notification = getNotificationContent(targetStatus, amountLabel, user?.locale || "en");
            await tx.notification.create({
              data: {
                userId: updated.userId,
                eventKey: `quote-event/${event.id}`,
                type: "QUOTE",
                title: notification.title,
                content: notification.content,
                link: `/user/quotes?reference=${updated.reference}`,
              },
            });
          }

          console.info("Quote status changed", { quoteId: current.id, quoteEventId: event.id });
        }

        return updated;
      });

      return NextResponse.json({ success: true, quote: serializeQuote(quote) });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && input.status) {
        const previousEvent = await prisma.quoteEvent.findUnique({ where: { requestKey: input.requestKey } });
        if (previousEvent?.quoteId === input.id && previousEvent.toStatus === input.status) {
          const quote = await prisma.quote.findFirst({ where: { id: input.id, deletedAt: null } });
          if (quote) return NextResponse.json({ success: true, quote: serializeQuote(quote) });
        }
        return apiError(409, "REQUEST_KEY_CONFLICT", "该请求标识已用于其他状态变更", requestId);
      }

      const domainErrors: Record<string, [number, string, string]> = {
        QUOTE_NOT_FOUND: [404, "QUOTE_NOT_FOUND", "询价不存在"],
        PRICING_FORBIDDEN: [403, "PRICING_FORBIDDEN", "当前角色或状态不能修改金额和币种"],
        CUSTOMER_NOTE_FORBIDDEN: [403, "CUSTOMER_NOTE_FORBIDDEN", "当前角色或状态不能修改客户备注"],
        INTERNAL_NOTE_FORBIDDEN: [403, "INTERNAL_NOTE_FORBIDDEN", "当前角色或状态不能修改内部备注"],
        INVALID_TRANSITION: [409, "INVALID_TRANSITION", "不允许执行该状态转换"],
        REASON_REQUIRED: [400, "REASON_REQUIRED", "该状态转换需要10至500字符的原因"],
        AMOUNT_CURRENCY_PAIR_REQUIRED: [400, "AMOUNT_CURRENCY_PAIR_REQUIRED", "报价金额和币种必须成对存在"],
        QUOTE_PRICE_REQUIRED: [400, "QUOTE_PRICE_REQUIRED", "进入已报价状态前必须提供金额和币种"],
      };
      const domainError = error instanceof Error ? domainErrors[error.message] : undefined;
      if (domainError) {
        const [status, code, message] = domainError;
        return apiError(status, code, message, requestId);
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return apiError(400, "INVALID_JSON", "请求内容不是有效的JSON", requestId);
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "更新数据校验失败", fieldErrors: error.flatten().fieldErrors },
          requestId,
        },
        { status: 400 },
      );
    }
    console.error("Update quote failed:", { requestId, error });
    return apiError(500, "INTERNAL_ERROR", "Failed to update quote", requestId);
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = randomUUID();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiError(401, "UNAUTHENTICATED", "Not authenticated", requestId);
    }
    if (session.user.role !== "ADMIN") {
      return apiError(403, "FORBIDDEN", "Only administrators can delete quotes", requestId);
    }

    const input = quoteSoftDeleteSchema.parse(await request.json());
    const current = await prisma.quote.findFirst({ where: { id: input.id, deletedAt: null } });
    if (!current) {
      return apiError(404, "QUOTE_NOT_FOUND", "询价不存在", requestId);
    }
    if (current.status !== "PENDING") {
      return apiError(409, "DELETE_NOT_ALLOWED", "只有待处理的重复、测试或无效询价可以删除", requestId);
    }

    await prisma.quote.update({
      where: { id: current.id },
      data: {
        deletedAt: new Date(),
        deletedById: session.user.id,
        deleteReason: input.reason,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return apiError(400, "INVALID_JSON", "请求内容不是有效的JSON", requestId);
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "删除请求校验失败", fieldErrors: error.flatten().fieldErrors },
          requestId,
        },
        { status: 400 },
      );
    }
    console.error("Delete quote failed:", { requestId, error });
    return apiError(500, "INTERNAL_ERROR", "Failed to delete quote", requestId);
  }
}
