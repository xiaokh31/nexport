import type {
  Clock,
  QuoteReferenceGenerator,
  RandomByteSource,
} from "../ports/external-services";

const REFERENCE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const RANDOM_BYTE_COUNT = 5;

export function formatQuoteReference(now: Date, bytes: Uint8Array) {
  if (bytes.length !== RANDOM_BYTE_COUNT) {
    throw new Error(`Quote references require exactly ${RANDOM_BYTE_COUNT} random bytes.`);
  }

  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  let buffer = 0;
  let bufferedBits = 0;
  let suffix = "";

  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bufferedBits += 8;
    while (bufferedBits >= 5) {
      bufferedBits -= 5;
      suffix += REFERENCE_ALPHABET[(buffer >> bufferedBits) & 31];
      buffer &= (1 << bufferedBits) - 1;
    }
  }

  return `Q-${date}-${suffix}`;
}

export function createQuoteReferenceGenerator(dependencies: {
  clock: Clock;
  randomBytes: RandomByteSource;
}): QuoteReferenceGenerator {
  return Object.freeze({
    generate: () => formatQuoteReference(
      dependencies.clock.now(),
      dependencies.randomBytes.bytes(RANDOM_BYTE_COUNT),
    ),
  });
}
