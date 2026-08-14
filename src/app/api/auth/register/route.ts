import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { registerFormSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 验证表单数据
    const validatedData = registerFormSchema.parse(body);
    
    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "该邮箱已被注册" },
        { status: 400 }
      );
    }

    // 创建用户
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        company: validatedData.company || null,
        phone: validatedData.phone || null,
      },
    });

    // 关联历史询价记录：将该邮箱的所有未关联用户的询价绑定到新用户
    const linkedQuotes = await prisma.quote.updateMany({
      where: {
        email: validatedData.email,
        userId: null, // 只关联未绑定用户的询价
      },
      data: {
        userId: user.id,
      },
    });

    // 关联历史联系记录
    const linkedContacts = await prisma.contact.updateMany({
      where: {
        email: validatedData.email,
        userId: null,
      },
      data: {
        userId: user.id,
      },
    });

    console.log("User registered:", user.email);
    console.log(`Linked ${linkedQuotes.count} historical quotes and ${linkedContacts.count} contacts`);

    return NextResponse.json(
      { 
        success: true, 
        message: "注册成功",
        linkedQuotes: linkedQuotes.count,
        linkedContacts: linkedContacts.count,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error registering user:", error);
    return NextResponse.json(
      { success: false, error: "注册失败，请稍后重试" },
      { status: 500 }
    );
  }
}
