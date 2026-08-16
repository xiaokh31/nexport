import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "仓储履约与运输解决方案",
  description: "按仓储履约、FBA 准备与交付、运输衔接查看八项服务的适用需求、范围边界和询价入口。",
  alternates: { canonical: "/solutions" },
  openGraph: {
    type: "website",
    url: "/solutions",
    title: "仓储履约与运输解决方案",
    description: "按仓储履约、FBA 准备与交付、运输衔接查看八项服务的适用需求、范围边界和询价入口。",
  },
};

export default function SolutionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
