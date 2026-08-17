import { randomBytes } from "node:crypto";

export interface Clock {
  now(): Date;
}

export interface RandomByteSource {
  bytes(length: number): Uint8Array;
}

export interface QuoteReferenceGenerator {
  generate(): string;
}

export interface CaptchaVerificationRequest {
  token: string;
  expectedAction?: string;
  remoteIp?: string;
}

export type CaptchaVerificationResult =
  | { success: true; score?: number; action?: string; hostname?: string }
  | {
      success: false;
      reason:
        | "MISSING"
        | "REJECTED"
        | "EXPIRED_OR_REPLAYED"
        | "ACTION_MISMATCH"
        | "HOSTNAME_MISMATCH"
        | "TIMEOUT"
        | "UNAVAILABLE";
    };

export interface CaptchaVerifier {
  verify(request: CaptchaVerificationRequest): Promise<CaptchaVerificationResult>;
}

export interface EmailDeliveryRequest {
  recipient: string;
  idempotencyKey: string;
  payload: Readonly<Record<string, unknown>>;
}

export type EmailDeliveryResult =
  | { success: true; providerMessageId: string }
  | {
      success: false;
      reason: "TIMEOUT" | "HTTP_4XX" | "HTTP_5XX" | "CONFIGURATION";
      retryable: boolean;
      ambiguous: boolean;
    };

export interface EmailSender {
  send(request: EmailDeliveryRequest): Promise<EmailDeliveryResult>;
}

export const systemClock = Object.freeze<Clock>({
  now: () => new Date(),
});

export const cryptoRandomByteSource = Object.freeze<RandomByteSource>({
  bytes: (length: number) => randomBytes(length),
});
