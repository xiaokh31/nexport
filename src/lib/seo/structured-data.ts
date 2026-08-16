export function isPlaceholderIdentityValue(value: string | null | undefined) {
  if (!value) return true;
  return /(?:company name|example\.(?:com|invalid|test)|@[^\s]+\.test\b|to be configured|\+?1[- (]*555)/i.test(value);
}

export function buildArticleStructuredData(input: {
  url: string;
  headline: string;
  description: string;
  datePublished: Date;
  dateModified: Date;
  author?: string | null;
  image?: string | null;
  section?: string;
  tags?: string[];
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    description: input.description,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": input.url,
    },
    datePublished: input.datePublished.toISOString(),
    dateModified: input.dateModified.toISOString(),
  };

  if (!isPlaceholderIdentityValue(input.author)) {
    schema.author = { "@type": "Person", name: input.author };
  }
  if (input.image) schema.image = [input.image];
  if (input.section) schema.articleSection = input.section;
  if (input.tags?.length) schema.keywords = input.tags;

  return schema;
}

export function buildServiceStructuredData(input: {
  name: string;
  description: string;
  url: string;
  serviceType: string;
  providerName?: string | null;
  areaServed?: string[];
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.name,
    description: input.description,
    url: input.url,
    serviceType: input.serviceType,
  };

  if (!isPlaceholderIdentityValue(input.providerName)) {
    schema.provider = { "@type": "Organization", name: input.providerName };
  }
  if (input.areaServed?.length) {
    schema.areaServed = input.areaServed.map((area) => ({
      "@type": "Place",
      name: area,
    }));
  }

  return schema;
}

export function buildBreadcrumbStructuredData(
  items: Array<{ name: string; url: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
