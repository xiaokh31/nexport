import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "物流解决方案",
  description: "查看 FBA 尾程、卡派、跨境运输、仓储、一件代发和退货处理解决方案。",
  alternates: { canonical: "/solutions" },
  openGraph: {
    type: "website",
    url: "/solutions",
    title: "物流解决方案",
    description: "查看 FBA 尾程、卡派、跨境运输、仓储、一件代发和退货处理解决方案。",
  },
};

export default function SolutionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
