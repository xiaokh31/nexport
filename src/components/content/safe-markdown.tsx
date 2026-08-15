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
      className="mt-10 scroll-mt-24 text-2xl font-bold tracking-tight"
      {...omitMarkdownNode(props)}
    />
  ),
  h2: (props) => (
    <h3
      className="mt-8 scroll-mt-24 text-xl font-semibold tracking-tight"
      {...omitMarkdownNode(props)}
    />
  ),
  h3: (props) => (
    <h4 className="mt-6 scroll-mt-24 text-lg font-semibold" {...omitMarkdownNode(props)} />
  ),
  h4: (props) => <h5 className="mt-5 font-semibold" {...omitMarkdownNode(props)} />,
  h5: (props) => <h6 className="mt-5 font-semibold" {...omitMarkdownNode(props)} />,
  h6: (props) => <h6 className="mt-5 font-semibold" {...omitMarkdownNode(props)} />,
  p: (props) => <p className="my-4 break-words leading-7" {...omitMarkdownNode(props)} />,
  a: (componentProps) => {
    const { href, ...props } = omitMarkdownNode(componentProps);
    const safeHref = href && isAllowedMarkdownLink(href) ? href : undefined;
    const external = safeHref?.startsWith("http://") || safeHref?.startsWith("https://");

    return (
      <a
        {...props}
        href={safeHref}
        className="break-all font-medium text-primary underline underline-offset-4"
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
        className="my-6 h-auto max-w-full rounded-lg"
      />
    );
  },
  blockquote: (props) => (
    <blockquote
      className="my-6 border-l-4 border-border pl-4 text-muted-foreground"
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
      className="my-6 max-w-full overflow-x-auto rounded-lg bg-muted p-4 text-sm"
      {...omitMarkdownNode(props)}
    />
  ),
  code: (props) => (
    <code
      className="break-words rounded bg-muted px-1.5 py-0.5 font-mono text-sm"
      {...omitMarkdownNode(props)}
    />
  ),
  table: (props) => (
    <div className="my-6 max-w-full overflow-x-auto rounded-md border">
      <table
        className="w-full min-w-max border-collapse text-sm"
        {...omitMarkdownNode(props)}
      />
    </div>
  ),
  th: (props) => (
    <th
      className="border-b bg-muted px-4 py-2 text-left font-semibold"
      {...omitMarkdownNode(props)}
    />
  ),
  td: (props) => (
    <td className="border-b px-4 py-2 align-top" {...omitMarkdownNode(props)} />
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
      className={cn("min-w-0 max-w-full break-words text-foreground", className)}
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
