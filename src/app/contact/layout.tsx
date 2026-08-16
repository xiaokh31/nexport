import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "提交询价",
  description: "提交服务类型、货物、线路和期望时间，形成可确认范围的履约或运输询价。",
  alternates: { canonical: "/contact" },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
