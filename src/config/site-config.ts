import type { ServiceType } from "@/config/quote";

export const siteLinks = {
  email: "contact@example.com",
  phone: "+1 (555) 000-0000",
  address: "Address to be configured",
};

export const siteInfo = {
  name: "Company Name",
};

export const solutionConfigs = [
  { key: "fbaLastMile", serviceType: "FBA_LAST_MILE", slug: "fba-last-mile" },
  { key: "truckFreight", serviceType: "TRUCK_FREIGHT", slug: "truck-freight" },
  { key: "crossBorder", serviceType: "CROSS_BORDER", slug: "cross-border" },
  { key: "amazonFba", serviceType: "AMAZON_FBA", slug: "amazon-fba" },
  { key: "express", serviceType: "EXPRESS", slug: "express" },
  { key: "warehouse", serviceType: "WAREHOUSE", slug: "warehouse" },
  { key: "dropshipping", serviceType: "DROPSHIPPING", slug: "dropshipping" },
  { key: "returns", serviceType: "RETURNS", slug: "returns" },
] as const satisfies ReadonlyArray<{
  key: string;
  serviceType: Exclude<ServiceType, "OTHER">;
  slug: string;
}>;

export type SolutionKey = typeof solutionConfigs[number]["key"];

type ServiceTypeDictionary = {
  solutions?: Partial<Record<SolutionKey, { title?: string }>>;
  form?: { otherService?: string };
};

export function getServiceTypeOptions(t: ServiceTypeDictionary) {
  return [
    ...solutionConfigs.map(({ key, serviceType }) => ({
      value: serviceType,
      label: t.solutions?.[key]?.title || key,
    })),
    {
      value: "OTHER" as const,
      label: t.form?.otherService || "Other",
    },
  ];
}

export function getServiceTypeLabel(serviceType: string, t: ServiceTypeDictionary) {
  return getServiceTypeOptions(t).find((option) => option.value === serviceType)?.label || serviceType;
}

export function getSolutionBySlug(slug: string) {
  return solutionConfigs.find((solution) => solution.slug === slug);
}
