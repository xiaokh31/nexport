/**
 * 邮件发送工具
 * 
 * 支持 Resend 和 SendGrid 两种服务
 * 
 * 使用 Resend：
 * 1. npm install resend
 * 2. 在 .env 中配置 RESEND_API_KEY
 * 
 * 使用 SendGrid：
 * 1. npm install @sendgrid/mail
 * 2. 在 .env 中配置 SENDGRID_API_KEY
 */

import { requireEmailRuntimeConfig } from "@/config/env/server";
import { EnvironmentConfigurationError } from "@/config/env/shared";

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

interface EmailResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

/**
 * 使用 Resend 发送邮件
 * 
 * 使用前需要：
 * 1. 安装依赖：npm install resend
 * 2. 在 .env 中配置 RESEND_API_KEY
 */
export async function sendEmail({ to, subject, html, from }: SendEmailOptions): Promise<EmailResult> {
  try {
    const emailConfig = requireEmailRuntimeConfig();

    // 动态导入 Resend
    const { Resend } = await import('resend');
    const resend = new Resend(emailConfig.apiKey);
    
    resend.domains.create({ name: process.env.EMAIL_DOMAIN || "" });
    resend.domains.get(process.env.EMAIL_VERIFY || "");
    resend.domains.verify(process.env.EMAIL_VERIFY || "");

    const { data, error } = await resend.emails.send({
      from: from || emailConfig.from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }

    console.log('Email sent successfully:', data?.id);
    return { success: true, messageId: data?.id };
  } catch (error: unknown) {
    if (error instanceof EnvironmentConfigurationError) {
      console.warn(error.message);
      return { success: false, error: 'Email service not configured' };
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // 检查是否是模块未安装错误
    if (errorMessage.includes("Cannot find module 'resend'")) {
      console.warn('Resend package not installed. Run: npm install resend');
      return { success: false, error: 'Resend package not installed. Run: npm install resend' };
    }
    
    console.error('Error sending email:', error);
    return { success: false, error: errorMessage };
  }
}

/**
 * 使用 SendGrid 发送邮件
 * 
 * 使用前需要：
 * 1. 安装依赖：npm install @sendgrid/mail
 * 2. 在 .env 中配置 SENDGRID_API_KEY
 */
// export async function sendEmailWithSendGrid({ to, subject, html, from }: SendEmailOptions): Promise<EmailResult> {
//   if (!process.env.SENDGRID_API_KEY) {
//     console.warn('SendGrid not configured. Please set SENDGRID_API_KEY in .env');
//     console.warn('To enable email, run: npm install @sendgrid/mail');
//     return { success: false, error: 'SendGrid not configured' };
//   }

//   try {
//     // 动态导入 SendGrid
//     // @ts-expect-error - @sendgrid/mail 是可选依赖，需要单独安装
//     const sgMail = await import('@sendgrid/mail');
//     sgMail.default.setApiKey(process.env.SENDGRID_API_KEY);
    
//     const msg = {
//       to: Array.isArray(to) ? to : [to],
//       from: from || process.env.EMAIL_FROM || 'noreply@example.com',
//       subject,
//       html,
//     };
    
//     await sgMail.default.send(msg);
//     console.log('Email sent successfully via SendGrid');
//     return { success: true };
//   } catch (error: unknown) {
//     const errorMessage = error instanceof Error ? error.message : String(error);
    
//     // 检查是否是模块未安装错误
//     if (errorMessage.includes("Cannot find module '@sendgrid/mail'")) {
//       console.warn('SendGrid package not installed. Run: npm install @sendgrid/mail');
//       return { success: false, error: 'SendGrid package not installed. Run: npm install @sendgrid/mail' };
//     }
    
//     console.error('Error sending email with SendGrid:', error);
//     return { success: false, error: errorMessage };
//   }
// }

// 邮件模板
export const emailTemplates = {
  // 新询价通知
  quoteNotification: (data: {
    name: string;
    email: string;
    phone: string;
    company?: string;
    serviceType: string;
    message: string;
  }) => ({
    subject: `新询价请求 - ${data.name}`,
    html: `
      <h2>新询价请求</h2>
      <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>姓名</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.name}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>邮箱</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.email}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>电话</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.phone}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>公司</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.company || '-'}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>服务类型</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.serviceType}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>留言</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.message}</td></tr>
      </table>
    `,
  }),

  // 联系表单通知
  contactNotification: (data: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
  }) => ({
    subject: `新联系留言 - ${data.subject}`,
    html: `
      <h2>新联系留言</h2>
      <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>姓名</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.name}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>邮箱</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.email}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>电话</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.phone || '-'}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>主题</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.subject}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>内容</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.message}</td></tr>
      </table>
    `,
  }),
};
