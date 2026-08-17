import { createHash } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { QuoteFormValues } from "@/lib/validations";
import type { QuoteReferenceGenerator } from "@/lib/ports/external-services";
import { resolveQuoteOwnership } from "@/lib/quote/ownership";

function nullableText(value: string | undefined) {
  const normalized = value?.normalize("NFC").trim();
  return normalized || null;
}

export function createQuoteSubmissionFingerprint(
  data: QuoteFormValues,
  subject: string,
) {
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

  return createHash("sha256")
    .update(JSON.stringify(canonicalPayload))
    .digest("hex");
}

export type SubmitQuoteResult =
  | { outcome: "CREATED"; reference: string; status: string }
  | { outcome: "REPLAYED"; reference: string; status: string }
  | { outcome: "SUBMISSION_KEY_CONFLICT" }
  | { outcome: "REFERENCE_UNAVAILABLE" };

export async function submitQuote(
  client: PrismaClient,
  input: {
    data: QuoteFormValues;
    sessionUserId: string | null | undefined;
    referenceGenerator: QuoteReferenceGenerator;
  },
): Promise<SubmitQuoteResult> {
  const { data } = input;
  const ownership = resolveQuoteOwnership(input.sessionUserId, data.email);
  const submissionFingerprint = createQuoteSubmissionFingerprint(
    data,
    ownership.fingerprintSubject,
  );

  const existingQuote = await client.quote.findUnique({
    where: { submissionKey: data.submissionKey },
    select: { reference: true, status: true, submissionFingerprint: true },
  });
  if (existingQuote) {
    return existingQuote.submissionFingerprint === submissionFingerprint
      ? {
          outcome: "REPLAYED",
          reference: existingQuote.reference,
          status: existingQuote.status,
        }
      : { outcome: "SUBMISSION_KEY_CONFLICT" };
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const quote = await client.quote.create({
        data: {
          reference: input.referenceGenerator.generate(),
          submissionKey: data.submissionKey,
          submissionFingerprint,
          userId: ownership.userId,
          name: data.name,
          email: data.email,
          phone: data.phone,
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
          requestedDate: data.requestedDate
            ? new Date(`${data.requestedDate}T00:00:00.000Z`)
            : null,
          message: data.message,
        },
        select: { reference: true, status: true },
      });
      return {
        outcome: "CREATED",
        reference: quote.reference,
        status: quote.status,
      };
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2002"
      ) {
        throw error;
      }

      const concurrentQuote = await client.quote.findUnique({
        where: { submissionKey: data.submissionKey },
        select: { reference: true, status: true, submissionFingerprint: true },
      });
      if (concurrentQuote) {
        return concurrentQuote.submissionFingerprint === submissionFingerprint
          ? {
              outcome: "REPLAYED",
              reference: concurrentQuote.reference,
              status: concurrentQuote.status,
            }
          : { outcome: "SUBMISSION_KEY_CONFLICT" };
      }
    }
  }

  return { outcome: "REFERENCE_UNAVAILABLE" };
}
