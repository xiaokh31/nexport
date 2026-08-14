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

    console.log("User registered:", user.email);

    return NextResponse.json(
      {
        success: true,
        message: "注册成功",
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
