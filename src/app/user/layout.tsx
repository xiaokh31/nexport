import type { Metadata } from "next";
import { UserSidebar } from "@/components/user/user-sidebar";

export const metadata: Metadata = {
  title: "用户中心",
  description: "管理您的个人信息和账户设置",
};

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container py-6 lg:py-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <UserSidebar />
        <section aria-label="用户工作区" className="min-w-0 flex-1">
          {children}
        </section>
      </div>
    </div>
  );
}
