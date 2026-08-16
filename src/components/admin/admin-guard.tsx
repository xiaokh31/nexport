"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { AdminAccessProvider } from "@/components/admin/admin-access-context";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { canAccessPath } from "@/lib/permissions";

interface AdminGuardProps {
  children: React.ReactNode;
}

function AccessNotice({
  message,
  href,
  label,
}: {
  message: string;
  href: string;
  label: string;
}) {
  return (
    <div role="alert" className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-3 bg-concrete/55 px-5 text-center">
      <span className="flex h-12 w-12 items-center justify-center border-2 border-dock-navy bg-paper-white">
        <AlertTriangle aria-hidden="true" className="h-6 w-6 text-destructive" />
      </span>
      <h1 className="font-display text-3xl font-bold">无法进入此工作区</h1>
      <p className="max-w-lg text-muted-foreground">{message}</p>
      <Link className="text-primary underline underline-offset-4" href={href}>
        {label}
      </Link>
    </div>
  );
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading, error } = useAdminAccess(session?.user?.id);
  const fallbackPath = profile?.defaultPath || "/dashboard";
  const pathAllowed = Boolean(
    profile?.defaultPath && canAccessPath(profile.subject, pathname),
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (
      status === "authenticated" &&
      !loading &&
      !error &&
      profile?.defaultPath &&
      !pathAllowed
    ) {
      router.replace(fallbackPath);
    }
  }, [
    error,
    fallbackPath,
    loading,
    pathAllowed,
    profile?.defaultPath,
    router,
    status,
  ]);

  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div role="status" aria-live="polite" aria-busy="true" className="flex min-h-[calc(100vh-4rem)] items-center justify-center gap-3">
        <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">正在核对后台权限…</span>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <AccessNotice
        message="需要登录后才能访问后台。"
        href="/login"
        label="前往登录"
      />
    );
  }

  if (error) {
    return <AccessNotice message={error} href="/dashboard" label="返回用户中心" />;
  }

  if (!profile?.defaultPath) {
    return (
      <AccessNotice
        message="当前账户没有后台访问能力。"
        href="/dashboard"
        label="返回用户中心"
      />
    );
  }

  if (!pathAllowed) {
    return (
      <AccessNotice
        message="当前账户无权访问此模块，正在跳转。"
        href={fallbackPath}
        label="前往可用模块"
      />
    );
  }

  return <AdminAccessProvider value={profile}>{children}</AdminAccessProvider>;
}
