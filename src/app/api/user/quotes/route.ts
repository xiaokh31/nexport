import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { QuoteStatus, Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QUOTE_STATUSES, type QuoteStatus as QuoteStatusValue } from "@/config/quote";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("limit") || "10", 10)));
    const status = searchParams.get("status");
    const where: Prisma.QuoteWhereInput = {
      userId: session.user.id,
      deletedAt: null,
    };

    if (status && status !== "all") {
      if (!QUOTE_STATUSES.includes(status as QuoteStatusValue)) {
        return NextResponse.json({ error: "未知询价状态" }, { status: 400 });
      }
      where.status = status as QuoteStatus;
    }

    const select = {
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
      quotedAt: true,
      createdAt: true,
      updatedAt: true,
    } satisfies Prisma.QuoteSelect;

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        select,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.quote.count({ where }),
    ]);

    return NextResponse.json({
      quotes: quotes.map((quote) => ({
        ...quote,
        amount: quote.amount?.toString() ?? null,
        weightValue: quote.weightValue?.toString() ?? null,
        length: quote.length?.toString() ?? null,
        width: quote.width?.toString() ?? null,
        height: quote.height?.toString() ?? null,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("获取询价记录失败:", error);
    return NextResponse.json({ error: "获取询价记录失败" }, { status: 500 });
  }
}
