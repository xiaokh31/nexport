import { z } from "zod";

export const emailOutboxPayloadSchema = z.object({
  version: z.literal(1),
  kind: z.enum(["QUOTE_STATUS", "REQUIRED_TRANSACTIONAL"]),
  from: z.string().trim().min(1).max(320).nullable(),
  subject: z.string().trim().min(1).max(998),
  html: z.string().min(1).max(200_000),
}).strict();

export type EmailOutboxPayload = z.infer<typeof emailOutboxPayloadSchema>;
