import { describe, expect, it } from "vitest";
import { serializeStructuredData } from "../../src/lib/security/structured-data";

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
});
