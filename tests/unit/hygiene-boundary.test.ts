import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(path.resolve(relativePath), "utf8");
}

function filesIn(directory: string): string[] {
  if (!existsSync(path.resolve(directory))) return [];
  return readdirSync(path.resolve(directory), { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(relative) : [relative];
  });
}

describe("HYG-001 repository hygiene boundaries", () => {
  it("keeps removed integrations out of the declared dependency graph", () => {
    const manifest = JSON.parse(source("package.json")) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    const declared = { ...manifest.dependencies, ...manifest.devDependencies };

    for (const dependency of [
      "@sanity/client",
      "@vercel/speed-insights",
      "@types/bcryptjs",
      "contentful",
      "next-intl",
      "next-sanity",
    ]) {
      expect(declared).not.toHaveProperty(dependency);
    }
  });

  it("removes legacy modules, routes, components, and starter assets", () => {
    for (const removedPath of [
      "src/app/services",
      "src/lib/cms",
      "src/lib/email.ts",
      "src/lib/email-delivery.ts",
      "src/components/notifications",
      "src/components/admin/index.ts",
      "src/components/user/index.ts",
      "src/types/index.ts",
      "public/file.svg",
      "public/globe.svg",
      "public/next.svg",
      "public/vercel.svg",
      "public/window.svg",
    ]) {
      expect(existsSync(path.resolve(removedPath)), removedPath).toBe(false);
    }

    expect(filesIn("public/images/services")).toEqual([]);
  });

  it("has no stale CMS, partner, missing image, or legacy route configuration", () => {
    const config = `${source("next.config.ts")}\n${source("src/config/site-config.ts")}`;

    for (const staleReference of [
      "@radix-ui/react-icons",
      "cdn.sanity.io",
      "images.ctfassets.net",
      "/og-image.jpg",
      "/partners/",
      "/images/services/",
    ]) {
      expect(config).not.toContain(staleReference);
    }

    const internalRouteOffenders = filesIn("src")
      .filter((file) => /\.(?:ts|tsx)$/.test(file))
      .filter((file) => /(?:href\s*=\s*["'`]\/services|href\s*:\s*["'`]\/services)/.test(source(file)));
    expect(internalRouteOffenders).toEqual([]);
  });

  it("keeps every quoted local static asset reference resolvable", () => {
    const assetPattern = /["'`](\/[^"'`?#\s]+\.(?:avif|gif|ico|jpe?g|json|png|svg|webp))["'`]/gi;
    const missingAssets = filesIn("src")
      .filter((file) => /\.(?:css|json|ts|tsx)$/.test(file))
      .flatMap((file) =>
        [...source(file).matchAll(assetPattern)]
          .map((match) => match[1])
          .filter((reference) => !existsSync(path.join(path.resolve("public"), reference)))
          .map((reference) => `${file}: ${reference}`),
      );

    expect(missingAssets).toEqual([]);
  });

  it("does not reintroduce unsafe any assertions or swallowed exceptions", () => {
    const sourceText = filesIn("src")
      .filter((file) => /\.(?:ts|tsx)$/.test(file))
      .map(source)
      .join("\n");

    expect(sourceText).not.toMatch(/\bas\s+any\b/);
    expect(sourceText).not.toMatch(/catch\s*(?:\([^)]*\))?\s*\{\s*(?:\/\/[^\n]*\s*)*\}/);
    expect(sourceText).not.toContain("\r");
  });
});
