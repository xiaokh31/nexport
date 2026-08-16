import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(path.resolve(relativePath), "utf8");
}

function sourceFiles(directory: string): string[] {
  return readdirSync(path.resolve(directory), { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(relative);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [relative] : [];
  });
}

describe("UI-002 home and solution boundaries", () => {
  it("replaces fake statistics and unconfirmed imagery with the real operating track", () => {
    const home = source("src/app/page.tsx");
    const hero = source("src/components/marketing/hero-section.tsx");
    const operations = source("src/components/marketing/operations-section.tsx");

    expect(home).toContain("<OperationsSection />");
    expect(home).not.toContain("StatsSection");
    expect(existsSync(path.resolve("src/components/marketing/stats-section.tsx"))).toBe(false);
    expect(hero).not.toContain("next/image");
    expect(hero).not.toContain("bg-gradient");
    expect(hero).not.toContain("/services");
    expect(operations).toContain("stage.customer");
    expect(operations).toContain("stage.operation");
    expect(operations).toContain("stage.outcome");
  });

  it("groups all eight services by purpose and exposes detail plus preselected quote links", () => {
    const content = source("src/config/marketing-content.ts");
    const homeSolutions = source("src/components/marketing/solutions-section.tsx");
    const index = source("src/app/solutions/page.tsx");

    expect(content).toContain('solutionKeys: ["warehouse", "dropshipping", "returns"]');
    expect(content).toContain('solutionKeys: ["amazonFba", "fbaLastMile"]');
    expect(content).toContain('solutionKeys: ["truckFreight", "crossBorder", "express"]');
    for (const page of [homeSolutions, index]) {
      expect(page).toContain('href={`/solutions/${config.slug}`}');
      expect(page).toContain('href={`/contact?service=${config.serviceType}`}');
      expect(page).not.toContain("next/image");
      expect(page).not.toContain("config.image");
    }
  });

  it("gives every detail a boundary, ordered process, quote inputs, real FAQ, and selected CTA", () => {
    const detail = source("src/app/solutions/[slug]/page.tsx");
    const layout = source("src/app/solutions/[slug]/layout.tsx");

    for (const contract of [
      "content.summary",
      "purpose.suitedFor",
      "content.capabilities",
      "content.exclusion",
      "purpose.process",
      "purpose.requiredInfo",
      "copy.detail.faqItems",
    ]) {
      expect(detail, contract).toContain(contract);
    }
    expect(detail).toContain('href={`/contact?service=${config.serviceType}`}');
    expect(layout).toContain("getSolutionUiContent(defaultLocale, config.key)");
    expect(layout).toContain('context="related"');
    expect(layout).toContain("<CTASection serviceType={solution.config.serviceType} />");
    expect(layout).not.toContain("config.image");
  });

  it("leaves no internal link pointing at the legacy services route", () => {
    const offenders = sourceFiles("src")
      .filter((file) => !file.startsWith(path.join("src", "app", "services")))
      .filter((file) => /(?:href\s*=\s*["'`]\/services|href\s*:\s*["'`]\/services)/.test(source(file)));

    expect(offenders).toEqual([]);
  });

  it("uses neutral copy and distinguishes FBA preparation from delivery and warehousing from WMS", () => {
    const content = source("src/config/marketing-content.ts");

    expect(content).toContain("海外仓储、订单履约与运输衔接");
    expect(content).toContain("FBA 入仓前准备");
    expect(content).toContain("FBA 预约与尾程交付");
    expect(content).toContain("这是作业服务，不是 WMS 软件销售");
    expect(content).not.toMatch(/全球领先|24\s*[x×]\s*7|仓储面积\s*\d|客户数\s*\d|准时率\s*\d/);
  });
});
