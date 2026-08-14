import { z } from "zod";
import {
  DIMENSION_UNITS,
  QUOTE_STATUSES,
  SERVICE_TYPES,
  WEIGHT_UNITS,
} from "@/config/quote";

function normalizedPositiveDecimal(integerDigits: number, scale: number, message: string) {
  const pattern = new RegExp(`^(?:0|[1-9]\\d{0,${integerDigits - 1}})(?:\\.\\d{1,${scale}})?$`);

  return z.string().trim().regex(pattern, message).refine(
    (value) => Number(value) > 0,
    message,
  ).transform((value) => {
    const [integer, fraction = ""] = value.split(".");
    const normalizedFraction = fraction.replace(/0+$/, "");
    return normalizedFraction ? `${integer}.${normalizedFraction}` : integer;
  });
}

const optionalText = (max: number, message: string) => z.string().trim().max(max, message).optional();
const optionalCount = z.number().int().min(0).max(1_000_000).optional();
const optionalWeightValue = normalizedPositiveDecimal(11, 3, "重量必须是大于0且最多3位小数的数值").optional();
const optionalDimensionValue = normalizedPositiveDecimal(9, 3, "尺寸必须是大于0且最多3位小数的数值").optional();
const optionalAmount = normalizedPositiveDecimal(12, 2, "报价金额必须是大于0且最多2位小数的数值").nullable().optional();
const normalizedEmailSchema = z.string()
  .trim()
  .toLowerCase()
  .email("请输入有效的邮箱地址")
  .max(254, "邮箱不能超过254个字符");

// 询价表单验证
export const quoteFormSchema = z.object({
  submissionKey: z.string().uuid("提交标识必须是有效的UUID"),
  name: z.string().trim().min(2, "姓名至少2个字符").max(100, "姓名不能超过100个字符"),
  email: normalizedEmailSchema,
  phone: z.string().trim().min(7, "请输入有效的电话号码").max(32, "电话号码不能超过32个字符"),
  company: optionalText(160, "公司名称不能超过160个字符"),
  serviceType: z.enum(SERVICE_TYPES, {
    message: "请选择服务类型",
  }),
  origin: optionalText(160, "发货地不能超过160个字符"),
  destination: optionalText(160, "目的地不能超过160个字符"),
  cargoType: optionalText(120, "货物类型不能超过120个字符"),
  pieceCount: optionalCount,
  cartonCount: optionalCount,
  palletCount: optionalCount,
  weightValue: optionalWeightValue,
  weightUnit: z.enum(WEIGHT_UNITS).optional(),
  length: optionalDimensionValue,
  width: optionalDimensionValue,
  height: optionalDimensionValue,
  dimensionUnit: z.enum(DIMENSION_UNITS).optional(),
  requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "期望日期格式必须为YYYY-MM-DD").optional(),
  message: z.string().trim().min(10, "留言内容至少10个字符").max(4_000, "留言内容不能超过4000个字符"),
  captchaToken: z.string().trim().min(1).max(4_096).optional(),
}).superRefine((data, ctx) => {
  if (Boolean(data.weightValue) !== Boolean(data.weightUnit)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: data.weightValue ? ["weightUnit"] : ["weightValue"],
      message: "重量数值和单位必须同时填写",
    });
  }

  const dimensionValues = [data.length, data.width, data.height];
  const hasAnyDimension = dimensionValues.some(Boolean) || Boolean(data.dimensionUnit);
  const hasAllDimensions = dimensionValues.every(Boolean) && Boolean(data.dimensionUnit);
  if (hasAnyDimension && !hasAllDimensions) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["length"],
      message: "长、宽、高和尺寸单位必须同时填写",
    });
  }

  if (data.requestedDate) {
    const requested = new Date(`${data.requestedDate}T00:00:00.000Z`);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (
      Number.isNaN(requested.getTime()) ||
      requested.toISOString().slice(0, 10) !== data.requestedDate ||
      requested < today
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["requestedDate"],
        message: "期望日期不能早于今天",
      });
    }
  }
});

export type QuoteFormValues = z.infer<typeof quoteFormSchema>;

export const quoteAdminUpdateSchema = z.object({
  id: z.string().min(1, "询价ID不能为空"),
  requestKey: z.string().uuid("请求标识必须是有效的UUID"),
  status: z.enum(QUOTE_STATUSES).optional(),
  amount: optionalAmount,
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "币种必须是三位大写字母").nullable().optional(),
  customerNote: z.string().trim().max(4_000, "客户备注不能超过4000个字符").nullable().optional(),
  internalNote: z.string().trim().max(4_000, "内部备注不能超过4000个字符").nullable().optional(),
  reason: z.string().trim().max(500, "原因不能超过500个字符").optional(),
}).superRefine((data, ctx) => {
  if ((data.amount !== undefined) !== (data.currency !== undefined)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: data.amount === undefined ? ["amount"] : ["currency"],
      message: "报价金额和币种必须同时提交",
    });
  }

  if (
    data.status === undefined &&
    data.amount === undefined &&
    data.customerNote === undefined &&
    data.internalNote === undefined
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [],
      message: "没有可更新的字段",
    });
  }
});

export const quoteSoftDeleteSchema = z.object({
  id: z.string().min(1, "询价ID不能为空"),
  reason: z.string().trim().min(10, "删除原因至少10个字符").max(500, "删除原因不能超过500个字符"),
});

// 登录表单验证
export const loginFormSchema = z.object({
  email: normalizedEmailSchema,
  password: z.string().min(6, "密码至少6个字符"),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

// 注册表单验证
export const registerFormSchema = z.object({
  name: z.string().min(2, "姓名至少2个字符"),
  email: normalizedEmailSchema,
  password: z.string().min(6, "密码至少6个字符"),
  confirmPassword: z.string().min(6, "密码至少6个字符"),
  company: z.string().optional(),
  phone: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "两次密码输入不一致",
  path: ["confirmPassword"],
});

export type RegisterFormValues = z.infer<typeof registerFormSchema>;
