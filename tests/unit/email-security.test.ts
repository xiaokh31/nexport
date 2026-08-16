import { describe, expect, it } from "vitest";
import {
  createQuoteNotificationTemplate,
  escapeHtml,
} from "../../src/lib/email-template";

describe("email security", () => {
  it("escapes every HTML metacharacter", () => {
    expect(escapeHtml(`<tag title="value">Tom & Jerry's</tag>`)).toBe(
      "&lt;tag title=&quot;value&quot;&gt;Tom &amp; Jerry&#39;s&lt;/tag&gt;",
    );
  });

  it("escapes quote fields and strips subject line breaks", () => {
    const malicious = `<img src=x onerror="alert('xss')"> &`;
    const template = createQuoteNotificationTemplate({
      name: `Attacker\r\nBcc: victim@example.com`,
      email: malicious,
      phone: malicious,
      company: malicious,
      serviceType: malicious,
      message: malicious,
    });

    expect(template.subject).toBe("新询价请求 - Attacker Bcc: victim@example.com");
    expect(template.subject).not.toMatch(/[\r\n]/);
    expect(template.html).not.toContain("<img");
    expect(template.html).not.toContain(malicious);
    expect(template.html).toContain(
      "&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt; &amp;",
    );
  });
});
