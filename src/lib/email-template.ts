export interface QuoteNotificationData {
  name: string;
  email: string;
  phone: string;
  company?: string;
  serviceType: string;
  message: string;
}

const HTML_ESCAPE_PATTERN = /[&<>"']/g;
const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(HTML_ESCAPE_PATTERN, (character) => HTML_ENTITIES[character]);
}

function sanitizeSubjectText(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export function createQuoteNotificationTemplate(data: QuoteNotificationData) {
  const rows = [
    ["姓名", data.name],
    ["邮箱", data.email],
    ["电话", data.phone],
    ["公司", data.company || "-"],
    ["服务类型", data.serviceType],
    ["留言", data.message],
  ];

  return {
    subject: `新询价请求 - ${sanitizeSubjectText(data.name)}`,
    html: `
      <h2>新询价请求</h2>
      <table style="border-collapse: collapse; width: 100%;">
        ${rows.map(([label, value]) => `<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>${label}</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(value)}</td></tr>`).join("\n        ")}
      </table>
    `,
  };
}

export const emailTemplates = {
  quoteNotification: createQuoteNotificationTemplate,
};
