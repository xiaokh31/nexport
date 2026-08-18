import { isIP } from "node:net";

export type HeaderSource =
  | Headers
  | Record<string, string | string[] | undefined>;

export type ClientIpTrustPolicy =
  | { source: "vercel" }
  | { source: "trusted-proxy"; trustedProxyHops: number };

function headerValue(headers: HeaderSource, name: string): string | null {
  if (headers instanceof Headers) return headers.get(name);

  const matchingName = Object.keys(headers).find(
    (headerName) => headerName.toLowerCase() === name.toLowerCase(),
  );
  const value = matchingName ? headers[matchingName] : undefined;
  return Array.isArray(value) ? value.join(",") : value || null;
}

function normalizeIp(value: string): string | null {
  const candidate = value.trim();
  if (isIP(candidate)) return candidate;

  const bracketedIpv6 = candidate.match(/^\[([^\]]+)](?::\d+)?$/);
  if (bracketedIpv6 && isIP(bracketedIpv6[1]) === 6) return bracketedIpv6[1];

  const ipv4WithPort = candidate.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (ipv4WithPort && isIP(ipv4WithPort[1]) === 4) return ipv4WithPort[1];

  return null;
}

export function resolveTrustedClientIp(
  headers: HeaderSource,
  policy: ClientIpTrustPolicy,
): string | null {
  if (policy.source === "vercel") {
    const vercelForwardedFor = headerValue(headers, "x-vercel-forwarded-for");
    if (!vercelForwardedFor || vercelForwardedFor.includes(",")) return null;
    return normalizeIp(vercelForwardedFor);
  }

  const { trustedProxyHops } = policy;
  if (!Number.isSafeInteger(trustedProxyHops) || trustedProxyHops <= 0) {
    return null;
  }

  const forwardedFor = headerValue(headers, "x-forwarded-for");
  if (forwardedFor) {
    const chain = forwardedFor.split(",").map(normalizeIp);
    const clientIndex = chain.length - trustedProxyHops;
    if (clientIndex >= 0) return chain[clientIndex];
  }

  if (trustedProxyHops === 1) {
    const realIp = headerValue(headers, "x-real-ip");
    if (realIp) return normalizeIp(realIp);
  }

  return null;
}
