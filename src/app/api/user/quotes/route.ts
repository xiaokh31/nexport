import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { QuoteStatus, Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type QuoteStatus as QuoteStatusValue } from "@/config/quote";
import { ownedQuoteWhere } from "@/lib/quote/ownership";
import { quoteListQuerySchema } from "@/lib/validations";
import { ZodError } from "zod";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = quoteListQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });
    const where: Prisma.QuoteWhereInput = ownedQuoteWhere(session.user.id);

    if (query.status !== "all") {
      where.status = query.status as QuoteStatus;
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
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.quote.count({ where }),
    ]);

    return NextResponse.json({
      quotes: quotes.map((quote) => {
        const publishedQuoteVisible = Boolean(
          quote.quotedAt &&
          (["QUOTED", "ACCEPTED", "REJECTED", "CLOSED"] as QuoteStatusValue[])
            .includes(quote.status as QuoteStatusValue),
        );
        return {
          ...quote,
          amount: publishedQuoteVisible ? quote.amount?.toString() ?? null : null,
          currency: publishedQuoteVisible ? quote.currency : null,
          customerNote: publishedQuoteVisible ? quote.customerNote : null,
          quotedAt: publishedQuoteVisible ? quote.quotedAt : null,
          weightValue: quote.weightValue?.toString() ?? null,
          length: quote.length?.toString() ?? null,
          width: quote.width?.toString() ?? null,
          height: quote.height?.toString() ?? null,
        };
      }),
      total,
      page: query.page,
      pages: Math.ceil(total / query.limit),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "查询参数无效" }, { status: 400 });
    }
    console.error("获取询价记录失败:", error);
    return NextResponse.json({ error: "获取询价记录失败" }, { status: 500 });
  }
}
