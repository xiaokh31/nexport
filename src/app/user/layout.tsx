import { Metadata } from "next";
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
    <div className="container py-8">
      <div className="flex gap-8">
        <UserSidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
