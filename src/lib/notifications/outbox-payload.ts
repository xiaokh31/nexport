import { z } from "zod";
import { EMAIL_VERIFICATION_ID_PATTERN } from "@/lib/auth/email-verification-token";

const commonPayload = {
  version: z.literal(1),
  from: z.string().trim().min(1).max(320).nullable(),
  subject: z.string().trim().min(1).max(998),
};

const htmlEmailPayloadSchema = z.object({
  ...commonPayload,
  kind: z.enum(["QUOTE_STATUS", "REQUIRED_TRANSACTIONAL"]),
  html: z.string().min(1).max(200_000),
}).strict();

const emailVerificationPayloadSchema = z.object({
  ...commonPayload,
  kind: z.literal("EMAIL_VERIFICATION"),
  verificationId: z.string().regex(EMAIL_VERIFICATION_ID_PATTERN),
  htmlTemplate: z.string().min(1).max(200_000),
}).strict();

export const emailOutboxPayloadSchema = z.discriminatedUnion("kind", [
  htmlEmailPayloadSchema,
  emailVerificationPayloadSchema,
]);

export type EmailOutboxPayload = z.infer<typeof emailOutboxPayloadSchema>;
