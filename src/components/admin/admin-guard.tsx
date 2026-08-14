"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { canAccessAdmin, canAccessPath, UserRole } from "@/lib/permissions";
import { Loader2 } from "lucide-react";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    // 未登录，重定向到登录页
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    const userRole = (session?.user?.role || "CUSTOMER") as UserRole;
    const canManageArticles = session?.user?.canManageArticles || false;

    // 检查是否可以访问管理后台
    if (!canAccessAdmin(userRole)) {
      router.push("/dashboard");
      return;
    }

    // 检查是否可以访问当前路径
    if (!canAccessPath(userRole, pathname, canManageArticles)) {
      // 重定向到用户可以访问的第一个模块
      // 对于员工，默认是消息管理
      if (userRole === "STAFF") {
        router.push("/admin/messages");
      } else {
        router.push("/dashboard");
      }
      return;
    }
  }, [session, status, pathname, router]);

  // 加载中
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 未登录或无权限
  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const userRole = (session?.user?.role || "CUSTOMER") as UserRole;
  const canManageArticles = session?.user?.canManageArticles || false;

  // 无权访问管理后台
  if (!canAccessAdmin(userRole)) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 无权访问当前路径
  if (!canAccessPath(userRole, pathname, canManageArticles)) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
