import { z } from "zod";
import {
  inspectMarkdown,
  isAllowedMarkdownImage,
  MARKDOWN_MAX_LENGTH,
} from "@/lib/content/markdown-policy";

const ARTICLE_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
const PAGE_STATUSES = ["DRAFT", "PUBLISHED"] as const;

function markdownSchema({ required }: { required: boolean }) {
  let schema = z.string().trim().max(
    MARKDOWN_MAX_LENGTH,
    `Markdown 内容不能超过 ${MARKDOWN_MAX_LENGTH} 个字符`,
  );

  if (required) {
    schema = schema.min(1, "Markdown 内容不能为空");
  }

  return schema.superRefine((value, context) => {
    if (!value) return;
    for (const issue of inspectMarkdown(value)) {
      context.addIssue({ code: "custom", message: issue.message });
    }
  });
}

const optionalNullableText = (max: number, message: string) =>
  z.string().trim().max(max, message).nullable().optional();

const contentImageSchema = z.string().trim().max(2_048, "图片地址不能超过2048个字符")
  .refine(
    (value) => !value || isAllowedMarkdownImage(value),
    "内容图片只能使用站内绝对路径（例如 /images/example.jpg）",
  )
  .nullable()
  .optional();

export const markdownContentSchema = markdownSchema({ required: true });
export const optionalMarkdownContentSchema = markdownSchema({ required: false }).nullable().optional();

const articleFields = {
  title: z.string().trim().min(1, "标题不能为空").max(200, "标题不能超过200个字符"),
  slug: z.string().trim().max(120, "URL 别名不能超过120个字符").optional(),
  excerpt: z.string().trim().max(500, "摘要不能超过500个字符").optional(),
  content: markdownContentSchema,
  coverImage: contentImageSchema,
  coverImageAlt: optionalNullableText(300, "图片替代文本不能超过300个字符"),
  seoTitle: optionalNullableText(70, "SEO 标题不能超过70个字符"),
  seoDescription: optionalNullableText(170, "SEO 描述不能超过170个字符"),
  category: z.string().trim().min(1, "分类不能为空").max(80, "分类不能超过80个字符").optional(),
  tags: z.array(z.string().trim().min(1).max(40, "单个标签不能超过40个字符"))
    .max(20, "标签不能超过20个")
    .optional(),
  status: z.enum(ARTICLE_STATUSES).optional(),
};

export const articleCreateSchema = z.object(articleFields).strict();

export const articleUpdateSchema = z.object(articleFields)
  .partial()
  .extend({ id: z.string().trim().min(1, "文章ID不能为空") })
  .strict()
  .refine((value) => Object.keys(value).some((key) => key !== "id"), {
    message: "没有可更新的文章字段",
  });

const pageFields = {
  slug: z.string().trim()
    .min(1, "页面标识不能为空")
    .max(120, "页面标识不能超过120个字符")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "页面标识只能包含小写字母、数字和连字符"),
  title: z.string().trim().min(1, "标题不能为空").max(200, "标题不能超过200个字符"),
  titleEn: optionalNullableText(200, "英文标题不能超过200个字符"),
  titleFr: optionalNullableText(200, "法文标题不能超过200个字符"),
  content: markdownContentSchema,
  contentEn: optionalMarkdownContentSchema,
  contentFr: optionalMarkdownContentSchema,
  status: z.enum(PAGE_STATUSES).optional(),
};

export const pageCreateSchema = z.object(pageFields).strict();

export const pageUpdateSchema = z.object(pageFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "没有可更新的页面字段",
  });
