"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { User, Key, FileText, Settings, LogOut, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLocale } from "@/i18n/locale-context";

export function UserSidebar() {
  const pathname = usePathname();
  const { t } = useLocale();

  const userNavItems = [
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
    <aside className="w-64 flex-shrink-0">
      <div className="sticky top-24 space-y-4">
        <div className="p-4 bg-muted/30 rounded-lg">
          <h2 className="font-semibold mb-4">{t.user.center}</h2>
          <nav className="space-y-1">
            {userNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Link>
              );
            })}
          </nav>
          <Separator className="my-4" />
          <Button
            variant="ghost"
            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
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
