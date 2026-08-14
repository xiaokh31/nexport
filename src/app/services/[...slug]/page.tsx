"use client";

import { use } from "react";
import { redirect } from "next/navigation";

// Slug映射表：旧的services路径到新的solutions路径
const slugMap: Record<string, string> = {
  "fba": "fba-last-mile",
  "dropshipping": "dropshipping",
  "returns": "returns",
  "warehouse": "warehouse",
};

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

// 处理所有 /services/* 路径的重定向
export default function ServicesRedirectPage({ params }: PageProps) {
  const { slug } = use(params);
  
  // 获取第一个路径段
  const firstSlug = slug[0];
  
  // 检查是否有映射
  const newSlug = slugMap[firstSlug];
  
  if (newSlug) {
    // 重定向到对应的solutions页面
    redirect(`/solutions/${newSlug}`);
  } else {
    // 未知路径，重定向到solutions首页
    redirect("/solutions");
  }
}
