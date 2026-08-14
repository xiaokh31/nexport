import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolutePath);
    return /\.(?:ts|tsx|js|jsx)$/.test(entry.name) ? [absolutePath] : [];
  });
}

describe("production/test boundary", () => {
  it("does not import fixtures or test doubles from production source", () => {
    const violations = sourceFiles(path.resolve("src")).filter((file) => {
      const source = readFileSync(file, "utf8");
      return /(?:from|import\()\s*["'][^"']*(?:tests\/|test\/support)/.test(source);
    });

    expect(violations).toEqual([]);
  });
});
