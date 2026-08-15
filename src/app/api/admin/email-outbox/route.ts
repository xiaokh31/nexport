import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireCapability } from "@/lib/authorization";
import {
  emailOutboxQuerySchema,
  emailOutboxRetrySchema,
} from "@/lib/notifications/validation";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const authorization = await requireCapability("notifications.broadcast");
    if (!authorization.authorized) return authorization.response;

    const query = emailOutboxQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const where = query.status ? { status: query.status } : undefined;
    const [items, statusCounts] = await Promise.all([
      prisma.emailOutbox.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: query.limit,
        select: {
          id: true,
          eventKey: true,
          recipient: true,
          status: true,
          attemptCount: true,
          nextAttemptAt: true,
          lockedAt: true,
          firstAttemptAt: true,
          sentAt: true,
          providerMessageId: true,
          lastError: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.emailOutbox.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);

    return NextResponse.json({
      items,
      statusCounts: Object.fromEntries(
        statusCounts.map((entry) => [entry.status, entry._count._all]),
      ),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "查询参数无效", details: error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    console.error("Get email outbox failed", { error });
    return NextResponse.json({ error: "获取邮件队列失败" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authorization = await requireCapability("notifications.broadcast");
    if (!authorization.authorized) return authorization.response;
    const input = emailOutboxRetrySchema.parse(await request.json());
    const result = await prisma.emailOutbox.updateMany({
      where: {
        id: input.id,
        status: { in: ["FAILED", "MANUAL_REVIEW"] },
      },
      data: {
        status: "PENDING",
        attemptCount: 0,
        nextAttemptAt: new Date(),
        lockedAt: null,
        firstAttemptAt: null,
        sentAt: null,
        providerMessageId: null,
        lastError: null,
      },
    });
    if (result.count === 0) {
      return NextResponse.json(
        { error: "邮件不存在或当前状态不能重试" },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return NextResponse.json({ error: "重试请求无效" }, { status: 400 });
    }
    console.error("Retry email outbox failed", { error });
    return NextResponse.json({ error: "重试邮件失败" }, { status: 500 });
  }
}
