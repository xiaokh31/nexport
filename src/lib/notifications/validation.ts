import { z } from "zod";
import { normalizeNotificationLink } from "@/lib/notifications/link";

export const NOTIFICATION_TYPES = [
  "SYSTEM",
  "QUOTE",
  "ORDER",
  "PROMOTION",
  "NEWS",
  "ALERT",
] as const;

export const EMAIL_OUTBOX_STATUSES = [
  "PENDING",
  "PROCESSING",
  "SENT",
  "FAILED",
  "MANUAL_REVIEW",
] as const;

const notificationLinkSchema = z.string().trim().max(2_048, "通知链接不能超过2048个字符")
  .refine(
    (value) => !value || normalizeNotificationLink(value) !== null,
    "通知链接必须是站内绝对路径",
  )
  .transform((value) => normalizeNotificationLink(value))
  .optional();

export const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unread: z.enum(["true", "false"]).optional(),
}).strict();

export const notificationMutationSchema = z.object({
  notificationId: z.string().trim().min(1).max(128).optional(),
  markAll: z.literal(true).optional(),
}).strict().superRefine((value, context) => {
  if (Boolean(value.notificationId) === Boolean(value.markAll)) {
    context.addIssue({
      code: "custom",
      message: "必须且只能指定 notificationId 或 markAll",
    });
  }
});

export const notificationBroadcastSchema = z.object({
  requestKey: z.string().uuid("requestKey 必须是 UUID"),
  userId: z.string().trim().min(1).max(128).optional(),
  sendToAll: z.boolean().default(false),
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string().trim().min(1, "通知标题不能为空").max(160, "通知标题不能超过160个字符"),
  content: z.string().trim().min(1, "通知内容不能为空").max(4_000, "通知内容不能超过4000个字符"),
  link: notificationLinkSchema,
}).strict().superRefine((value, context) => {
  if (value.sendToAll && value.userId) {
    context.addIssue({ code: "custom", path: ["userId"], message: "全体广播不能同时指定用户" });
  }
  if (!value.sendToAll && !value.userId) {
    context.addIssue({ code: "custom", path: ["userId"], message: "请指定接收用户" });
  }
});

export const emailOutboxQuerySchema = z.object({
  status: z.enum(EMAIL_OUTBOX_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict();

export const emailOutboxRetrySchema = z.object({
  id: z.string().trim().min(1).max(128),
  action: z.literal("RETRY"),
}).strict();
