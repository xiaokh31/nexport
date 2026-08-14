import { z } from "zod";

// 询价表单验证
export const quoteFormSchema = z.object({
  name: z.string().min(2, "姓名至少2个字符"),
  email: z.string().email("请输入有效的邮箱地址"),
  phone: z.string().min(10, "请输入有效的电话号码"),
  company: z.string().optional(),
  serviceType: z.enum(["FBA", "DROPSHIPPING", "RETURNS", "OTHER"], {
    message: "请选择服务类型",
  }),
  origin: z.string().optional(),
  destination: z.string().optional(),
  cargoType: z.string().optional(),
  weight: z.string().optional(),
  dimensions: z.string().optional(),
  message: z.string().min(10, "留言内容至少10个字符"),
});

export type QuoteFormValues = z.infer<typeof quoteFormSchema>;

// 联系表单验证
export const contactFormSchema = z.object({
  name: z.string().min(2, "姓名至少2个字符"),
  email: z.string().email("请输入有效的邮箱地址"),
  phone: z.string().optional(),
  subject: z.string().min(2, "主题至少2个字符"),
  message: z.string().min(10, "留言内容至少10个字符"),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

// 登录表单验证
export const loginFormSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(6, "密码至少6个字符"),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

// 注册表单验证
export const registerFormSchema = z.object({
  name: z.string().min(2, "姓名至少2个字符"),
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(6, "密码至少6个字符"),
  confirmPassword: z.string().min(6, "密码至少6个字符"),
  company: z.string().optional(),
  phone: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "两次密码输入不一致",
  path: ["confirmPassword"],
});

export type RegisterFormValues = z.infer<typeof registerFormSchema>;
