import { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminGuard } from "@/components/admin/admin-guard";

export const metadata: Metadata = {
  title: "管理后台",
  description: "Company Name 管理后台",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <div className="flex min-h-[calc(100vh-4rem)]">
        <AdminSidebar />
        {/* 移动端全屏，桌面端有左侧边距 */}
        <main className="flex-1 p-4 lg:p-8 w-full overflow-x-auto">{children}</main>
      </div>
    </AdminGuard>
  );
}
