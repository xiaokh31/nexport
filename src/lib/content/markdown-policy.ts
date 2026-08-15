export const MARKDOWN_MAX_LENGTH = 100_000;

const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);
const MARKDOWN_DESTINATION_PATTERN = /(!?)\[[^\]]*\]\(\s*(?:<([^>\s]+)>|([^\s)]+))/g;
const MARKDOWN_REFERENCE_PATTERN = /^\s{0,3}\[[^\]]+\]:\s*(?:<([^>\s]+)>|([^\s]+))/gm;
const HTML_CANDIDATE_PATTERN = /<!--[\s\S]*?(?:-->|$)|<!doctype[^>]*(?:>|$)|<\/?\s*[A-Za-z][^>]*(?:>|$)/gi;

function decodeUrlEntities(value: string): string {
  const decodeCodePoint = (code: number, fallback: string) =>
    Number.isInteger(code) && code >= 0 && code <= 0x10ffff
      ? String.fromCodePoint(code)
      : fallback;

  return value
    .replace(/&#x([0-9a-f]+);?/gi, (entity: string, code: string) =>
      decodeCodePoint(Number.parseInt(code, 16), entity),
    )
    .replace(/&#([0-9]+);?/g, (entity: string, code: string) =>
      decodeCodePoint(Number.parseInt(code, 10), entity),
    )
    .replace(/&colon;?/gi, ":");
}

function normalizedUrl(value: string): string {
  return decodeUrlEntities(value).trim().replace(/[\u0000-\u0020\u007f]+/g, "");
}

function isLocalReference(value: string): boolean {
  if (!value || value.includes("\\") || value.startsWith("//")) return false;

  return (
    value.startsWith("/") ||
    value.startsWith("./") ||
    value.startsWith("../") ||
    value.startsWith("#") ||
    value.startsWith("?") ||
    !/^[A-Za-z][A-Za-z\d+.-]*:/.test(value)
  );
}

export function isAllowedMarkdownLink(value: string): boolean {
  const normalized = normalizedUrl(value);
  if (isLocalReference(normalized)) return true;

  const protocol = normalized.match(/^([A-Za-z][A-Za-z\d+.-]*:)/)?.[1].toLowerCase();
  return protocol ? SAFE_LINK_PROTOCOLS.has(protocol) : false;
}

/**
 * Editorial images are deliberately limited to same-origin, root-relative
 * assets. This keeps the public renderer independent from third-party image
 * hosts and gives CSP one deterministic content-image policy.
 */
export function isAllowedMarkdownImage(value: string): boolean {
  const normalized = normalizedUrl(value);
  return normalized.startsWith("/") && !normalized.startsWith("//") && !normalized.includes("\\");
}

export function containsRawHtml(markdown: string): boolean {
  HTML_CANDIDATE_PATTERN.lastIndex = 0;

  for (const match of markdown.matchAll(HTML_CANDIDATE_PATTERN)) {
    const candidate = match[0];
    const inner = candidate.slice(1, candidate.endsWith(">") ? -1 : undefined).trim();

    // CommonMark autolinks are Markdown, not raw HTML.
    if (/^(?:https?:\/\/|mailto:)[^\s<>]+$/i.test(inner)) continue;
    if (/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(inner)) continue;
    return true;
  }

  return false;
}

export interface MarkdownPolicyIssue {
  code: "RAW_HTML" | "UNSAFE_LINK" | "UNSAFE_IMAGE";
  message: string;
}

export function inspectMarkdown(markdown: string): MarkdownPolicyIssue[] {
  const issues: MarkdownPolicyIssue[] = [];

  if (containsRawHtml(markdown)) {
    issues.push({
      code: "RAW_HTML",
      message: "内容仅支持 Markdown，不能包含原始 HTML",
    });
  }

  MARKDOWN_DESTINATION_PATTERN.lastIndex = 0;
  for (const match of markdown.matchAll(MARKDOWN_DESTINATION_PATTERN)) {
    const isImage = match[1] === "!";
    const destination = match[2] || match[3] || "";
    const allowed = isImage
      ? isAllowedMarkdownImage(destination)
      : isAllowedMarkdownLink(destination);

    if (!allowed) {
      issues.push({
        code: isImage ? "UNSAFE_IMAGE" : "UNSAFE_LINK",
        message: isImage
          ? "Markdown 图片只能使用站内绝对路径（例如 /images/example.jpg）"
          : "Markdown 链接仅支持站内地址、http、https 或 mailto",
      });
    }
  }

  MARKDOWN_REFERENCE_PATTERN.lastIndex = 0;
  for (const match of markdown.matchAll(MARKDOWN_REFERENCE_PATTERN)) {
    const destination = match[1] || match[2] || "";
    if (!isAllowedMarkdownLink(destination)) {
      issues.push({
        code: "UNSAFE_LINK",
        message: "Markdown 引用链接仅支持站内地址、http、https 或 mailto",
      });
    }
  }

  return issues;
}
