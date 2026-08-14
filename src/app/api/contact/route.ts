import { NextResponse } from "next/server";
import { contactFormSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { serverEnv } from "@/config/env/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 验证表单数据
    const validatedData = contactFormSchema.parse(body);
    
    // 保存到数据库
    const contact = await prisma.contact.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone || null,
        subject: validatedData.subject,
        message: validatedData.message,
      },
    });

    // 发送邮件通知
    if (serverEnv.emailTo) {
      const { sendEmail, emailTemplates } = await import('@/lib/email');
      const emailData = {
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone,
        subject: validatedData.subject,
        message: validatedData.message,
      };
      
      const template = emailTemplates.contactNotification(emailData);
      
      const emailResult = await sendEmail({
        to: serverEnv.emailTo,
        subject: template.subject,
        html: template.html,
      });
      
      if (emailResult.success) {
        console.log('Contact notification email sent successfully');
      } else {
        console.error('Failed to send contact notification email:', emailResult.error);
      }
    }

    console.log("Contact request saved:", contact.id);

    return NextResponse.json(
      { success: true, message: "留言已提交", contactId: contact.id },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing contact:", error);
    return NextResponse.json(
      { success: false, error: "提交失败，请稍后重试" },
      { status: 500 }
    );
  }
}
