import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "../../src/app/manifest";
import {
  getBrandedEmailFrom,
  siteInfo,
} from "../../src/config/site-config";
import { createQuoteNotificationTemplate } from "../../src/lib/email-template";
import {
  createEmailVerificationHtmlTemplate,
  getEmailVerificationSubject,
} from "../../src/lib/auth/email-verification-token";

function source(relativePath: string) {
  return readFileSync(path.resolve(relativePath), "utf8");
}

describe("BRAND-001 public brand boundaries", () => {
  it("keeps legal, display, and short names in one canonical configuration", () => {
    expect(siteInfo).toEqual({
      legalName: "ZNB Logistics Inc.",
      displayName: "ZNB Logistics Inc.",
      shortName: "ZNB",
    });
  });

  it("generates the manifest from the canonical brand configuration", () => {
    expect(manifest()).toMatchObject({
      name: siteInfo.displayName,
      short_name: siteInfo.shortName,
      start_url: "/",
      theme_color: "#102632",
    });
    expect(source("src/app/layout.tsx")).toContain('manifest: "/manifest.webmanifest"');
  });

  it("uses ZNB only in brand contexts while preserving customer company labels", () => {
    const locales = ["zh", "en", "fr"].map((locale) =>
      JSON.parse(source(`src/i18n/locales/${locale}.json`)),
    );
    for (const dictionary of locales) {
      expect(dictionary.about.title).toContain(siteInfo.displayName);
      expect(dictionary.admin.description).toContain(siteInfo.shortName);
      expect(dictionary.auth.loginDescription).toContain(siteInfo.shortName);
      expect(dictionary.auth.registerDescription).toContain(siteInfo.shortName);
      expect(dictionary.dashboard.description).toContain(siteInfo.shortName);
    }
    const [, english] = locales;
    expect(english.contact.form.company).toBe("Company Name");
    expect(english.user.company).toBe("Company Name");
    expect(english.auth.company).toBe("Company Name");
  });

  it("removes public brand placeholders and unreviewed legal contact details", () => {
    const publicBrandSources = [
      "src/app/layout.tsx",
      "src/app/about/page.tsx",
      "src/app/privacy/page.tsx",
      "src/app/terms/page.tsx",
      "src/components/layout/header.tsx",
      "src/components/layout/footer.tsx",
    ].map(source).join("\n");
    expect(publicBrandSources).not.toContain("Company Name");
    expect(publicBrandSources).not.toContain("contact@example.com");
    expect(source("src/app/privacy/page.tsx")).toMatch(/专业审核|professional privacy and legal review/);
    expect(source("src/app/terms/page.tsx")).toMatch(/专业审核|professional legal review/);
  });

  it("brands operational email subjects, bodies, and sender display names", () => {
    const verificationHtml = createEmailVerificationHtmlTemplate({
      siteUrl: "https://www.example.invalid",
      locale: "en",
    });
    const quote = createQuoteNotificationTemplate({
      name: "Customer",
      email: "customer@example.test",
      phone: "+1 555 0100",
      serviceType: "WAREHOUSE",
      message: "Quote request",
    });

    expect(getEmailVerificationSubject("en")).toMatch(/^ZNB \|/);
    expect(verificationHtml).toContain(">ZNB<");
    expect(quote.subject).toMatch(/^ZNB \|/);
    expect(quote.html).toContain(">ZNB<");
    expect(getBrandedEmailFrom("Nexport <notifications@example.test>"))
      .toBe("ZNB <notifications@example.test>");
  });

  it("keeps internal test identity markers outside the public brand migration", () => {
    expect(source("compose.test.yml")).toContain("name: nexport-test");
    expect(source(".env.example")).toContain("nexport-test-only");
    expect(source("package.json")).toContain('"name": "company-website"');
    expect(source("src/components/captcha.tsx")).not.toMatch(/data-nexport|nexportRecaptcha/);
  });
});
