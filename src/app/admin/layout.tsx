import type { Metadata } from "next";
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
      <div className="flex min-h-[calc(100svh-4.625rem)] bg-concrete/55">
        <AdminSidebar />
        <section
          aria-label="管理工作区"
          className="w-full min-w-0 flex-1 overflow-x-auto p-4 lg:p-8"
        >
          {children}
        </section>
      </div>
    </AdminGuard>
  );
}
