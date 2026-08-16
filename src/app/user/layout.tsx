import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { UserSidebar } from "@/components/user/user-sidebar";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "用户中心",
  description: "查看账户询价、通知与资料设置",
};

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="bg-concrete/55 py-6 lg:py-8">
      <div className="container">
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <UserSidebar />
        <section aria-label="用户工作区" className="min-w-0 flex-1">
          {children}
        </section>
      </div>
      </div>
    </div>
  );
}
