import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError, z } from "zod";
import { authOptions } from "@/lib/auth";
import { requireCapability } from "@/lib/authorization";
import {
  BroadcastRequestConflictError,
  BroadcastTargetNotFoundError,
  broadcastNotifications,
} from "@/lib/notifications/broadcast";
import {
  notificationBroadcastSchema,
  notificationListQuerySchema,
  notificationMutationSchema,
} from "@/lib/notifications/validation";
import { prisma } from "@/lib/prisma";

const notificationIdSchema = z.string().trim().min(1).max(128);

function invalidRequest(error: ZodError) {
  return NextResponse.json(
    { error: "请求参数无效", details: error.flatten().fieldErrors },
    { status: 400 },
  );
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const query = notificationListQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const where = {
      userId: session.user.id,
      ...(query.unread === "true" ? { isRead: false } : {}),
    };
    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: session.user.id, isRead: false },
      }),
    ]);
    return NextResponse.json({
      notifications,
      total,
      unreadCount,
      page: query.page,
      pages: Math.ceil(total / query.limit),
    });
  } catch (error) {
    if (error instanceof ZodError) return invalidRequest(error);
    console.error("Get notifications failed", { error });
    return NextResponse.json({ error: "获取通知失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authorization = await requireCapability("notifications.broadcast");
    if (!authorization.authorized) return authorization.response;
    const input = notificationBroadcastSchema.parse(await request.json());
    const result = await broadcastNotifications(
      prisma,
      authorization.actor.id,
      input,
    );
    return NextResponse.json({
      success: true,
      ...result,
      message: `已发送给 ${result.recipientCount} 位用户`,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "请求内容不是有效的 JSON" }, { status: 400 });
    }
    if (error instanceof ZodError) return invalidRequest(error);
    if (error instanceof BroadcastRequestConflictError) {
      return NextResponse.json(
        { error: "requestKey 已用于不同的广播内容" },
        { status: 409 },
      );
    }
    if (error instanceof BroadcastTargetNotFoundError) {
      return NextResponse.json({ error: "接收用户不存在" }, { status: 404 });
    }
    console.error("Broadcast notification failed", { error });
    return NextResponse.json({ error: "发送通知失败" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const input = notificationMutationSchema.parse(await request.json());
    const result = await prisma.notification.updateMany({
      where: input.markAll
        ? { userId: session.user.id, isRead: false }
        : { id: input.notificationId, userId: session.user.id },
      data: { isRead: true },
    });
    if (!input.markAll && result.count === 0) {
      return NextResponse.json({ error: "通知不存在" }, { status: 404 });
    }
    return NextResponse.json({ success: true, updatedCount: result.count });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return NextResponse.json({ error: "标记请求无效" }, { status: 400 });
    }
    console.error("Mark notification failed", { error });
    return NextResponse.json({ error: "标记通知失败" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const notificationId = notificationIdSchema.parse(
      new URL(request.url).searchParams.get("id"),
    );
    const result = await prisma.notification.deleteMany({
      where: { id: notificationId, userId: session.user.id },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "通知不存在" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "通知 ID 无效" }, { status: 400 });
    }
    console.error("Delete notification failed", { error });
    return NextResponse.json({ error: "删除通知失败" }, { status: 500 });
  }
}
