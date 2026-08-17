"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, User, Key, FileText, Settings, LogOut, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLocale } from "@/i18n/locale-context";
import { siteInfo } from "@/config/site-config";

export function UserSidebar() {
  const pathname = usePathname();
  const { t } = useLocale();
  const userCenterLabel = `${siteInfo.shortName} ${t.user.center}`;

  const userNavItems = [
    {
      title: t.dashboard.title,
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: t.user.profile,
      href: "/user/profile",
      icon: User,
    },
    {
      title: t.user.password,
      href: "/user/password",
      icon: Key,
    },
    {
      title: t.user.myQuotes,
      href: "/user/quotes",
      icon: FileText,
    },
    {
      title: t.messages.notifications,
      href: "/user/notifications",
      icon: Bell,
    },
    {
      title: t.user.accountSettings,
      href: "/user/settings",
      icon: Settings,
    },
  ];

  return (
    <aside className="w-full flex-shrink-0 lg:w-64">
      <div className="space-y-4 lg:sticky lg:top-24">
        <div className="rounded-md border border-sidebar-border bg-sidebar p-4 text-sidebar-foreground">
          <h2 className="font-display mb-4 text-xl font-semibold tracking-wide">
            {userCenterLabel}
          </h2>
          <nav aria-label={userCenterLabel} className="grid gap-1 sm:grid-cols-2 lg:block lg:space-y-1">
            {userNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-sm border-l-2 px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "border-signal-amber bg-sidebar-accent text-sidebar-accent-foreground"
                      : "border-transparent text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Link>
              );
            })}
          </nav>
          <Separator className="my-4 bg-sidebar-border" />
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t.user.logout}
          </Button>
        </div>
      </div>
    </aside>
  );
}
