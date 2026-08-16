import {
  buildArticleStructuredData,
  buildBreadcrumbStructuredData,
  buildServiceStructuredData,
} from "@/lib/seo/structured-data";
import { serializeStructuredData } from "@/lib/security/structured-data";

function StructuredData({ id, value }: { id: string; value: unknown }) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeStructuredData(value) }}
    />
  );
}

export function ArticleSchema(input: {
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
  return (
    <StructuredData
      id="article-schema"
      value={buildArticleStructuredData(input)}
    />
  );
}

export function ServiceSchema(input: {
  name: string;
  description: string;
  url: string;
  serviceType: string;
  providerName?: string | null;
  areaServed?: string[];
}) {
  return (
    <StructuredData
      id="service-schema"
      value={buildServiceStructuredData(input)}
    />
  );
}

export function BreadcrumbSchema({
  items,
}: {
  items: Array<{ name: string; url: string }>;
}) {
  return (
    <StructuredData
      id="breadcrumb-schema"
      value={buildBreadcrumbStructuredData(items)}
    />
  );
}

export function FAQSchema({
  items,
}: {
  items: Array<{ question: string; answer: string }>;
}) {
  return (
    <StructuredData
      id="faq-schema"
      value={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      }}
    />
  );
}
