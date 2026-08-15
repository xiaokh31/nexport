import { createHash } from "node:crypto";

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createEmailIdempotencyKey(eventKey: string, recipient: string): string {
  const canonical = `${eventKey.trim()}\u0000${recipient.trim().toLowerCase()}`;
  return `email/v1/${digest(canonical)}`;
}

export interface BroadcastFingerprintInput {
  targetScope: "ALL_USERS" | "USER";
  targetUserId: string | null;
  type: string;
  title: string;
  content: string;
  link: string | null;
}

export function createBroadcastFingerprint(input: BroadcastFingerprintInput): string {
  return digest(JSON.stringify({ version: 1, ...input }));
}
