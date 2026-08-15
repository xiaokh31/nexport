import type {
  EmailDeliveryRequest,
  EmailDeliveryResult,
  EmailSender,
} from "@/lib/ports/external-services";
import { emailOutboxPayloadSchema } from "@/lib/notifications/outbox-payload";

export interface ResendError {
  message?: string;
  name?: string;
  statusCode?: number;
}

export function classifyResendError(error: ResendError): EmailDeliveryResult {
  const statusCode = error.statusCode;
  const errorName = error.name?.toLowerCase();
  const concurrentIdempotentRequest = errorName === "concurrent_idempotent_requests";
  const retryable = concurrentIdempotentRequest ||
    statusCode === 429 ||
    (statusCode !== undefined && statusCode >= 500) ||
    errorName === "rate_limit_exceeded" ||
    errorName === "application_error" ||
    errorName === "internal_server_error";
  return {
    success: false,
    reason: retryable ? "HTTP_5XX" : "HTTP_4XX",
    retryable,
    ambiguous: concurrentIdempotentRequest,
  };
}

export class ResendEmailSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly defaultFrom: string | null = null,
  ) {}

  async send(request: EmailDeliveryRequest): Promise<EmailDeliveryResult> {
    const payload = emailOutboxPayloadSchema.safeParse(request.payload);
    const from = payload.success
      ? payload.data.from || this.defaultFrom?.trim() || null
      : null;
    if (!payload.success || !from) {
      return {
        success: false,
        reason: "CONFIGURATION",
        retryable: false,
        ambiguous: false,
      };
    }

    try {
      const { Resend } = await import("resend");
      const resend = new Resend(this.apiKey);
      const { data, error } = await resend.emails.send(
        {
          from,
          to: [request.recipient],
          subject: payload.data.subject,
          html: payload.data.html,
        },
        { idempotencyKey: request.idempotencyKey },
      );
      if (error) return classifyResendError(error);
      if (!data?.id) {
        return {
          success: false,
          reason: "HTTP_5XX",
          retryable: true,
          ambiguous: true,
        };
      }
      return { success: true, providerMessageId: data.id };
    } catch {
      return {
        success: false,
        reason: "TIMEOUT",
        retryable: true,
        ambiguous: true,
      };
    }
  }
}
