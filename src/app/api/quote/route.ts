import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { quoteFormSchema, type QuoteFormValues } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { serverEnv } from "@/config/env/server";
import {
  cryptoRandomByteSource,
  systemClock,
} from "@/lib/ports/external-services";
import { resolveQuoteOwnership } from "@/lib/quote/ownership";
import { createQuoteReferenceGenerator } from "@/lib/quote/reference";

const quoteReferenceGenerator = createQuoteReferenceGenerator({
  clock: systemClock,
  randomBytes: cryptoRandomByteSource,
});

function nullableText(value: string | undefined) {
  const normalized = value?.normalize("NFC").trim();
  return normalized || null;
}

function createSubmissionFingerprint(data: QuoteFormValues, subject: string) {
  const canonicalPayload = {
    version: 1,
    subject,
    name: data.name.normalize("NFC").trim(),
    email: data.email.normalize("NFC").trim().toLowerCase(),
    phone: data.phone.normalize("NFC").trim(),
    company: nullableText(data.company),
    serviceType: data.serviceType,
    origin: nullableText(data.origin),
    destination: nullableText(data.destination),
    cargoType: nullableText(data.cargoType),
    pieceCount: data.pieceCount ?? null,
    cartonCount: data.cartonCount ?? null,
    palletCount: data.palletCount ?? null,
    weightValue: data.weightValue ?? null,
    weightUnit: data.weightUnit ?? null,
    length: data.length ?? null,
    width: data.width ?? null,
    height: data.height ?? null,
    dimensionUnit: data.dimensionUnit ?? null,
    requestedDate: data.requestedDate ?? null,
    message: data.message.normalize("NFC").trim(),
  };

  return createHash("sha256").update(JSON.stringify(canonicalPayload)).digest("hex");
}

function successResponse(reference: string, status: string, httpStatus: number) {
  return NextResponse.json(
    { success: true, data: { reference, status } },
    { status: httpStatus },
  );
}

function errorResponse(
  requestId: string,
  status: number,
  code: string,
  message: string,
  fieldErrors?: Record<string, string[] | undefined>,
) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) },
      requestId,
    },
    { status },
  );
}

export async function POST(request: Request) {
  const requestId = randomUUID();

  try {
    const validatedData = quoteFormSchema.parse(await request.json());
    const session = await getServerSession(authOptions);
    const ownership = resolveQuoteOwnership(session?.user?.id, validatedData.email);
    const submissionFingerprint = createSubmissionFingerprint(
      validatedData,
      ownership.fingerprintSubject,
    );

    const existingQuote = await prisma.quote.findUnique({
      where: { submissionKey: validatedData.submissionKey },
      select: { reference: true, status: true, submissionFingerprint: true },
    });

    if (existingQuote) {
      if (existingQuote.submissionFingerprint !== submissionFingerprint) {
        return errorResponse(requestId, 409, "SUBMISSION_KEY_CONFLICT", "该提交标识已用于不同的询价内容");
      }
      return successResponse(existingQuote.reference, existingQuote.status, 200);
    }

    let quote: { reference: string; status: string } | null = null;

    for (let attempt = 0; attempt < 5 && !quote; attempt += 1) {
      try {
        quote = await prisma.quote.create({
          data: {
            reference: quoteReferenceGenerator.generate(),
            submissionKey: validatedData.submissionKey,
            submissionFingerprint,
            userId: ownership.userId,
            name: validatedData.name,
            email: validatedData.email,
            phone: validatedData.phone,
            company: nullableText(validatedData.company),
            serviceType: validatedData.serviceType,
            origin: nullableText(validatedData.origin),
            destination: nullableText(validatedData.destination),
            cargoType: nullableText(validatedData.cargoType),
            pieceCount: validatedData.pieceCount ?? null,
            cartonCount: validatedData.cartonCount ?? null,
            palletCount: validatedData.palletCount ?? null,
            weightValue: validatedData.weightValue ?? null,
            weightUnit: validatedData.weightUnit ?? null,
            length: validatedData.length ?? null,
            width: validatedData.width ?? null,
            height: validatedData.height ?? null,
            dimensionUnit: validatedData.dimensionUnit ?? null,
            requestedDate: validatedData.requestedDate
              ? new Date(`${validatedData.requestedDate}T00:00:00.000Z`)
              : null,
            message: validatedData.message,
          },
          select: { reference: true, status: true },
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
          throw error;
        }

        const concurrentQuote = await prisma.quote.findUnique({
          where: { submissionKey: validatedData.submissionKey },
          select: { reference: true, status: true, submissionFingerprint: true },
        });

        if (concurrentQuote) {
          if (concurrentQuote.submissionFingerprint !== submissionFingerprint) {
            return errorResponse(requestId, 409, "SUBMISSION_KEY_CONFLICT", "该提交标识已用于不同的询价内容");
          }
          return successResponse(concurrentQuote.reference, concurrentQuote.status, 200);
        }
      }
    }

    if (!quote) {
      return errorResponse(requestId, 503, "REFERENCE_UNAVAILABLE", "暂时无法生成询价编号，请重试");
    }

    if (serverEnv.emailTo) {
      const { sendEmail, emailTemplates } = await import("@/lib/email");
      const template = emailTemplates.quoteNotification({
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone,
        company: validatedData.company,
        serviceType: validatedData.serviceType,
        message: validatedData.message,
      });

      const emailResult = await sendEmail({
        to: serverEnv.emailTo,
        subject: template.subject,
        html: template.html,
      });

      if (!emailResult.success) {
        console.error("Failed to send quote notification email:", emailResult.error);
      }
    }

    return successResponse(quote.reference, quote.status, 201);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse(requestId, 400, "INVALID_JSON", "请求内容不是有效的JSON");
    }
    if (error instanceof ZodError) {
      return errorResponse(
        requestId,
        400,
        "VALIDATION_ERROR",
        "询价数据校验失败",
        error.flatten().fieldErrors,
      );
    }

    console.error("Error processing quote:", { requestId, error });
    return errorResponse(requestId, 500, "INTERNAL_ERROR", "提交失败，请稍后重试");
  }
}
