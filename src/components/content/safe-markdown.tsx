import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import {
  isAllowedMarkdownImage,
  isAllowedMarkdownLink,
} from "@/lib/content/markdown-policy";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const allowedMarkdownElements = [
  "a",
  "blockquote",
  "br",
  "code",
  "del",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
];

function omitMarkdownNode<T extends { node?: unknown }>({ node, ...props }: T): Omit<T, "node"> {
  void node;
  return props;
}

const components: Components = {
  h1: (props) => (
    <h2
      className="mt-12 break-words border-b-2 border-dock-navy pb-3 font-display text-3xl font-bold tracking-tight"
      {...omitMarkdownNode(props)}
    />
  ),
  h2: (props) => (
    <h3
      className="mt-10 break-words text-2xl font-semibold tracking-tight"
      {...omitMarkdownNode(props)}
    />
  ),
  h3: (props) => (
    <h4 className="mt-8 break-words text-xl font-semibold" {...omitMarkdownNode(props)} />
  ),
  h4: (props) => <h5 className="mt-7 break-words font-semibold" {...omitMarkdownNode(props)} />,
  h5: (props) => <h6 className="mt-7 break-words font-semibold" {...omitMarkdownNode(props)} />,
  h6: (props) => <h6 className="mt-7 break-words font-semibold" {...omitMarkdownNode(props)} />,
  p: (props) => <p className="my-5 break-words leading-8 [overflow-wrap:anywhere]" {...omitMarkdownNode(props)} />,
  a: (componentProps) => {
    const { href, ...props } = omitMarkdownNode(componentProps);
    const safeHref = href && isAllowedMarkdownLink(href) ? href : undefined;
    const external = safeHref?.startsWith("http://") || safeHref?.startsWith("https://");

    return (
      <a
        {...props}
        href={safeHref}
        className="break-all font-medium text-steel-blue underline underline-offset-4"
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      />
    );
  },
  img: (componentProps) => {
    const { src, alt } = omitMarkdownNode(componentProps);
    const source = typeof src === "string" ? src : "";
    if (!isAllowedMarkdownImage(source)) return null;

    return (
      // Editorial images are policy-checked before this native element is rendered.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={source}
        alt={alt || ""}
        loading="lazy"
        decoding="async"
        className="my-8 block h-auto max-w-full border-b-4 border-signal-amber"
      />
    );
  },
  blockquote: (props) => (
    <blockquote
      className="my-8 border-l-4 border-signal-amber bg-concrete px-5 py-1 text-muted-foreground"
      {...omitMarkdownNode(props)}
    />
  ),
  ul: (props) => (
    <ul className="my-4 list-disc space-y-2 pl-6" {...omitMarkdownNode(props)} />
  ),
  ol: (props) => (
    <ol className="my-4 list-decimal space-y-2 pl-6" {...omitMarkdownNode(props)} />
  ),
  pre: (props) => (
    <pre
      tabIndex={0}
      role="region"
      aria-label="可横向滚动的代码块"
      data-markdown-code
      className="my-8 max-w-full overflow-x-auto border-l-4 border-steel-blue bg-dock-navy p-4 text-sm text-paper-white [&_code]:whitespace-pre [&_code]:break-normal [&_code]:bg-transparent [&_code]:p-0"
      {...omitMarkdownNode(props)}
    />
  ),
  code: (props) => (
    <code
      className="break-all bg-concrete px-1.5 py-0.5 font-utility text-sm"
      {...omitMarkdownNode(props)}
    />
  ),
  table: (props) => (
    <div
      tabIndex={0}
      role="region"
      aria-label="可横向滚动的文章表格"
      data-markdown-table
      className="my-8 max-w-full overflow-x-auto border-2 border-dock-navy"
    >
      <table
        className="w-full min-w-max border-collapse text-left text-sm"
        {...omitMarkdownNode(props)}
      />
    </div>
  ),
  th: (props) => (
    <th
      className="border-b border-r bg-dock-navy px-4 py-3 text-left font-semibold text-paper-white"
      {...omitMarkdownNode(props)}
    />
  ),
  td: (props) => (
    <td className="border-b border-r px-4 py-3 align-top" {...omitMarkdownNode(props)} />
  ),
};

function markdownUrlTransform(url: string, key: string): string {
  if (key === "src") return isAllowedMarkdownImage(url) ? url : "";
  return isAllowedMarkdownLink(url) ? url : "";
}

/** Shared server-capable renderer used by public content and admin previews. */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div
      data-safe-markdown="true"
      className={cn("min-w-0 max-w-full break-words text-foreground [overflow-wrap:anywhere]", className)}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
        allowedElements={allowedMarkdownElements}
        skipHtml
        unwrapDisallowed
        urlTransform={markdownUrlTransform}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/** Preview intentionally delegates to the exact public rendering pipeline. */
export function MarkdownPreview(props: MarkdownRendererProps) {
  return <MarkdownRenderer {...props} />;
}
