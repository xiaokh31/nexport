import { describe, expect, it } from "vitest";
import { serializeStructuredData } from "../../src/lib/security/structured-data";
import {
  buildArticleStructuredData,
  buildBreadcrumbStructuredData,
  buildServiceStructuredData,
} from "../../src/lib/seo/structured-data";

describe("structured data serialization", () => {
  it("cannot terminate the JSON-LD script element", () => {
    const serialized = serializeStructuredData({
      title: "</script><script>window.compromised=true</script>",
      separator: "\u2028\u2029",
    });

    expect(serialized).not.toContain("<");
    expect(serialized).not.toContain(">");
    expect(serialized).not.toContain("\u2028");
    expect(serialized).not.toContain("\u2029");
    expect(serialized).toContain("\\u003c/script\\u003e");
  });

  it("builds parseable Article JSON-LD without placeholder enterprise facts", () => {
    const schema = buildArticleStructuredData({
      url: "https://www.example.test/news/warehouse-update",
      headline: "Warehouse update",
      description: "A real published article.",
      datePublished: new Date("2026-08-15T12:00:00.000Z"),
      dateModified: new Date("2026-08-16T12:00:00.000Z"),
      author: "Company Name",
      image: "https://www.example.test/images/news/warehouse.jpg",
      section: "service",
      tags: ["warehouse"],
    });
    const parsed = JSON.parse(serializeStructuredData(schema));

    expect(parsed).toMatchObject({
      "@type": "Article",
      headline: "Warehouse update",
      datePublished: "2026-08-15T12:00:00.000Z",
      dateModified: "2026-08-16T12:00:00.000Z",
    });
    expect(parsed).not.toHaveProperty("author");
    expect(JSON.stringify(parsed)).not.toMatch(/Company Name|LocalBusiness/i);
  });

  it("emits only supplied Service and Breadcrumb facts", () => {
    const service = buildServiceStructuredData({
      name: "FBA last mile",
      description: "Port pickup and scheduled warehouse delivery.",
      url: "https://www.example.test/solutions/fba-last-mile",
      serviceType: "FBA_LAST_MILE",
      providerName: "Company Name",
    });
    const breadcrumb = buildBreadcrumbStructuredData([
      { name: "Home", url: "https://www.example.test" },
      { name: "FBA last mile", url: "https://www.example.test/solutions/fba-last-mile" },
    ]);

    expect(JSON.parse(serializeStructuredData(service))).not.toHaveProperty("provider");
    expect(JSON.parse(serializeStructuredData(service))).not.toHaveProperty("areaServed");
    expect(JSON.parse(serializeStructuredData(breadcrumb)).itemListElement).toHaveLength(2);
  });
});
