export const SERVICE_TYPES = [
  "FBA_LAST_MILE",
  "TRUCK_FREIGHT",
  "CROSS_BORDER",
  "AMAZON_FBA",
  "EXPRESS",
  "WAREHOUSE",
  "DROPSHIPPING",
  "RETURNS",
  "OTHER",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

export const WEIGHT_UNITS = ["KG", "LB"] as const;
export type WeightUnit = (typeof WEIGHT_UNITS)[number];

export const DIMENSION_UNITS = ["CM", "IN"] as const;
export type DimensionUnit = (typeof DIMENSION_UNITS)[number];

export const QUOTE_STATUSES = [
  "PENDING",
  "PROCESSING",
  "QUOTED",
  "ACCEPTED",
  "REJECTED",
  "CLOSED",
] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

const SERVICE_TYPE_SET: ReadonlySet<string> = new Set(SERVICE_TYPES);

export function isServiceType(value: unknown): value is ServiceType {
  return typeof value === "string" && SERVICE_TYPE_SET.has(value);
}
