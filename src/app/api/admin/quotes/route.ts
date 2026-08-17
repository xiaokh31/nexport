import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma, QuoteStatus } from "@prisma/client";
import { ZodError } from "zod";
import { requireCapability } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import {
  quoteAdminUpdateSchema,
  quoteListQuerySchema,
  quoteSoftDeleteSchema,
} from "@/lib/validations";
import { serverEnv } from "@/config/env/server";
import { systemClock } from "@/lib/ports/external-services";
import {
  QuoteWorkflowError,
  softDeleteQuote,
  updateQuoteWorkflow,
} from "@/lib/quote/admin-service";
import { asQuoteActorRole } from "@/lib/quote/workflow";

const adminQuoteSelect = {
  id: true,
  reference: true,
  name: true,
  email: true,
  phone: true,
  company: true,
  serviceType: true,
  origin: true,
  destination: true,
  cargoType: true,
  pieceCount: true,
  cartonCount: true,
  palletCount: true,
  weightValue: true,
  weightUnit: true,
  length: true,
  width: true,
  height: true,
  dimensionUnit: true,
  requestedDate: true,
  message: true,
  status: true,
  amount: true,
  currency: true,
  customerNote: true,
  internalNote: true,
  quotedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.QuoteSelect;

type AdminQuoteView = Prisma.QuoteGetPayload<{ select: typeof adminQuoteSelect }>;

function serializeQuote(quote: AdminQuoteView) {
  return {
    ...quote,
    amount: quote.amount?.toString() ?? null,
    weightValue: quote.weightValue?.toString() ?? null,
    length: quote.length?.toString() ?? null,
    width: quote.width?.toString() ?? null,
    height: quote.height?.toString() ?? null,
  };
}

function apiError(
  status: number,
  code: string,
  message: string,
  requestId: string = randomUUID(),
) {
  return NextResponse.json(
    { success: false, error: { code, message }, requestId },
    { status },
  );
}

const workflowErrors: Record<
  Exclude<QuoteWorkflowError["code"], "DELETE_NOT_ALLOWED">,
  [number, string]
> = {
  QUOTE_NOT_FOUND: [404, "询价不存在"],
  REQUEST_KEY_CONFLICT: [409, "该请求标识已用于其他状态变更"],
  PRICING_FORBIDDEN: [403, "当前角色或状态不能修改金额和币种"],
  CUSTOMER_NOTE_FORBIDDEN: [403, "当前角色或状态不能修改客户备注"],
  INTERNAL_NOTE_FORBIDDEN: [403, "当前角色或状态不能修改内部备注"],
  INVALID_TRANSITION: [409, "不允许执行该状态转换"],
  REASON_REQUIRED: [400, "该状态转换需要10至500字符的原因"],
  AMOUNT_CURRENCY_PAIR_REQUIRED: [400, "报价金额和币种必须成对存在"],
  QUOTE_PRICE_REQUIRED: [400, "进入已报价状态前必须提供金额和币种"],
};

function workflowErrorResponse(error: QuoteWorkflowError, requestId: string) {
  if (error.code === "DELETE_NOT_ALLOWED") {
    return apiError(
      409,
      error.code,
      "只有从未进入处理流程的待处理重复、测试或无效询价可以删除",
      requestId,
    );
  }
  const [status, message] = workflowErrors[error.code];
  return apiError(status, error.code, message, requestId);
}

export async function GET(request: NextRequest) {
  const requestId = randomUUID();

  try {
    const authorization = await requireCapability("quotes.read");
    if (!authorization.authorized) return authorization.response;

    const query = quoteListQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    const where: Prisma.QuoteWhereInput = { deletedAt: null };
    if (query.status !== "all") {
      where.status = query.status as QuoteStatus;
    }
    if (query.search) {
      where.OR = [
        { reference: { contains: query.search, mode: "insensitive" } },
        { name: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
        { phone: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        select: adminQuoteSelect,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.quote.count({ where }),
    ]);

    return NextResponse.json({
      quotes: quotes.map(serializeQuote),
      total,
      page: query.page,
      pages: Math.ceil(total / query.limit),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "查询参数无效", requestId);
    }
    console.error("Get quotes failed", { requestId, error });
    return apiError(500, "INTERNAL_ERROR", "获取询价失败", requestId);
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = randomUUID();

  try {
    const authorization = await requireCapability("quotes.update");
    if (!authorization.authorized) return authorization.response;
    const actorRole = asQuoteActorRole(authorization.actor.role);
    if (!actorRole) {
      return apiError(403, "FORBIDDEN", "无权处理询价", requestId);
    }

    const update = quoteAdminUpdateSchema.parse(await request.json());
    const result = await updateQuoteWorkflow(prisma, {
      actorId: authorization.actor.id,
      actorRole,
      update,
      emailFrom: serverEnv.emailFrom,
      clock: systemClock,
    });
    if (result.eventId) {
      console.info("Quote status changed", {
        quoteId: result.quote.id,
        quoteEventId: result.eventId,
      });
    }
    return NextResponse.json({
      success: true,
      quote: serializeQuote(result.quote),
      replayed: result.replayed,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return apiError(400, "INVALID_JSON", "请求内容不是有效的JSON", requestId);
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "更新数据校验失败",
            fieldErrors: error.flatten().fieldErrors,
          },
          requestId,
        },
        { status: 400 },
      );
    }
    if (error instanceof QuoteWorkflowError) {
      return workflowErrorResponse(error, requestId);
    }
    console.error("Update quote failed", { requestId, error });
    return apiError(500, "INTERNAL_ERROR", "更新询价失败", requestId);
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = randomUUID();

  try {
    const authorization = await requireCapability("quotes.delete");
    if (!authorization.authorized) return authorization.response;

    const deletion = quoteSoftDeleteSchema.parse(await request.json());
    await softDeleteQuote(prisma, {
      actorId: authorization.actor.id,
      deletion,
      clock: systemClock,
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
          error: {
            code: "VALIDATION_ERROR",
            message: "删除请求校验失败",
            fieldErrors: error.flatten().fieldErrors,
          },
          requestId,
        },
        { status: 400 },
      );
    }
    if (error instanceof QuoteWorkflowError) {
      return workflowErrorResponse(error, requestId);
    }
    console.error("Delete quote failed", { requestId, error });
    return apiError(500, "INTERNAL_ERROR", "删除询价失败", requestId);
  }
}
