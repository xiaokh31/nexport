import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { quoteFormSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { serverEnv } from "@/config/env/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 验证表单数据
    const validatedData = quoteFormSchema.parse(body);
    
    // 检查用户是否登录，如果登录则关联userId
    const session = await getServerSession(authOptions);
    let userId: string | null = null;
    
    if (session?.user?.id) {
      userId = session.user.id;
    } else if (validatedData.email) {
      // 如果用户未登录，尝试通过邮箱查找对应的用户ID
      const existingUser = await prisma.user.findUnique({
        where: { email: validatedData.email },
        select: { id: true },
      });
      if (existingUser) {
        userId = existingUser.id;
      }
    }
    
    // 保存到数据库
    const quote = await prisma.quote.create({
      data: {
        userId,
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone,
        company: validatedData.company || null,
        serviceType: validatedData.serviceType as "FBA" | "DROPSHIPPING" | "RETURNS" | "OTHER",
        origin: validatedData.origin || null,
        destination: validatedData.destination || null,
        cargoType: validatedData.cargoType || null,
        weight: validatedData.weight || null,
        dimensions: validatedData.dimensions || null,
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
        company: validatedData.company,
        serviceType: validatedData.serviceType,
        message: validatedData.message,
      };
      
      const template = emailTemplates.quoteNotification(emailData);
      
      const emailResult = await sendEmail({
        to: serverEnv.emailTo,
        subject: template.subject,
        html: template.html,
      });
      
      if (emailResult.success) {
        console.log('Quote notification email sent successfully');
      } else {
        console.error('Failed to send quote notification email:', emailResult.error);
      }
    }

    console.log("Quote request saved:", quote.id);

    return NextResponse.json(
      { success: true, message: "询价请求已提交", quoteId: quote.id },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing quote:", error);
    return NextResponse.json(
      { success: false, error: "提交失败，请稍后重试" },
      { status: 500 }
    );
  }
}
