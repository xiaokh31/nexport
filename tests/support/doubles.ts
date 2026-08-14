import type {
  CaptchaVerificationRequest,
  CaptchaVerificationResult,
  CaptchaVerifier,
  Clock,
  EmailDeliveryRequest,
  EmailDeliveryResult,
  EmailSender,
  QuoteReferenceGenerator,
  RandomByteSource,
} from "../../src/lib/ports/external-services";

function assertTestOnly() {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Test doubles may only be instantiated with NODE_ENV=test.");
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

export class FixedClock implements Clock {
  private currentTime: Date;

  constructor(initialTime: Date | string) {
    assertTestOnly();
    this.currentTime = new Date(initialTime);
  }

  now() {
    return new Date(this.currentTime);
  }

  set(nextTime: Date | string) {
    this.currentTime = new Date(nextTime);
  }

  advance(milliseconds: number) {
    this.currentTime = new Date(this.currentTime.getTime() + milliseconds);
  }
}

export class FakeRandomByteSource implements RandomByteSource {
  private readonly values: Uint8Array[];

  constructor(values: Array<Uint8Array | number[]>) {
    assertTestOnly();
    this.values = values.map((value) => Uint8Array.from(value));
  }

  bytes(length: number) {
    const value = this.values.shift();
    if (!value) {
      throw new Error("No fake random bytes remain.");
    }
    if (value.length !== length) {
      throw new Error(`Expected ${length} fake random bytes, received ${value.length}.`);
    }
    return Uint8Array.from(value);
  }
}

export class FakeQuoteReferenceGenerator implements QuoteReferenceGenerator {
  private readonly references: string[];

  constructor(references: string[]) {
    assertTestOnly();
    this.references = [...references];
  }

  generate() {
    const reference = this.references.shift();
    if (!reference) {
      throw new Error("No fake quote references remain.");
    }
    return reference;
  }
}

export class FakeCaptchaVerifier implements CaptchaVerifier {
  readonly requests: CaptchaVerificationRequest[] = [];
  private result: CaptchaVerificationResult;

  constructor(result: CaptchaVerificationResult = { success: true }) {
    assertTestOnly();
    this.result = result;
  }

  setResult(result: CaptchaVerificationResult) {
    this.result = result;
  }

  async verify(request: CaptchaVerificationRequest) {
    this.requests.push(structuredClone(request));
    return structuredClone(this.result);
  }
}

export type FakeEmailOutcome = "success" | "timeout" | "http-4xx" | "http-5xx";

export class RecordingEmailSender implements EmailSender {
  readonly deliveries: EmailDeliveryRequest[] = [];
  private outcome: FakeEmailOutcome;

  constructor(outcome: FakeEmailOutcome = "success") {
    assertTestOnly();
    this.outcome = outcome;
  }

  setOutcome(outcome: FakeEmailOutcome) {
    this.outcome = outcome;
  }

  get idempotencyKeys() {
    return this.deliveries.map((delivery) => delivery.idempotencyKey);
  }

  async send(request: EmailDeliveryRequest): Promise<EmailDeliveryResult> {
    const snapshot = deepFreeze(structuredClone(request));
    this.deliveries.push(snapshot);

    if (this.outcome === "success") {
      return {
        success: true,
        providerMessageId: `fake-message-${this.deliveries.length}`,
      };
    }
    if (this.outcome === "timeout") {
      return {
        success: false,
        reason: "TIMEOUT",
        retryable: true,
        ambiguous: true,
      };
    }
    if (this.outcome === "http-4xx") {
      return {
        success: false,
        reason: "HTTP_4XX",
        retryable: false,
        ambiguous: false,
      };
    }
    return {
      success: false,
      reason: "HTTP_5XX",
      retryable: true,
      ambiguous: false,
    };
  }
}
