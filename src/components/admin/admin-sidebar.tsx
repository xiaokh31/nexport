"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  Settings,
  Newspaper,
  Home,
  Bell,
  FileText,
  type LucideIcon,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useLocale } from "@/i18n/locale-context";
import { useAdminAccessContext } from "@/components/admin/admin-access-context";
import { canAccessModule, type AdminModule } from "@/lib/permissions";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  module: AdminModule;
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { t } = useLocale();
  const { subject } = useAdminAccessContext();
  const [mobileOpen, setMobileOpen] = useState(false);

  // 定义所有管理模块
  const allNavItems: NavItem[] = [
    {
      title: t.admin?.overview || "概览",
      href: "/admin",
      icon: LayoutDashboard,
      module: 'overview',
    },
    {
      title: t.admin?.articles || "文章管理",
      href: "/admin/articles",
      icon: Newspaper,
      module: 'articles',
    },
    {
      title: t.admin?.quotes || "询价管理",
      href: "/admin/quotes",
      icon: MessageSquare,
      module: 'quotes',
    },
    {
      title: t.admin?.users || "用户管理",
      href: "/admin/users",
      icon: Users,
      module: 'users',
    },
    {
      title: t.admin?.messages || "通知管理",
      href: "/admin/messages",
      icon: Bell,
      module: 'messages',
    },
    {
      title: t.admin?.pages?.title || "页面管理",
      href: "/admin/pages",
      icon: FileText,
      module: 'pages',
    },
    {
      title: t.admin?.settings || "系统设置",
      href: "/admin/settings",
      icon: Settings,
      module: 'settings',
    },
  ];

  // 根据用户角色过滤可访问的菜单项
  const filteredNavItems = allNavItems.filter((item) =>
    canAccessModule(subject, item.module),
  );

  // 导航内容组件
  const NavContent = ({
    onItemClick,
    showHeading = true,
  }: {
    onItemClick?: () => void;
    showHeading?: boolean;
  }) => (
    <div className="p-4">
      {showHeading && (
        <h2 className="font-display mb-4 text-xl font-bold tracking-wide">
          {t.admin?.title || "管理后台"}
        </h2>
      )}
      <nav aria-label={t.admin?.title || "管理后台"} className="space-y-1">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || 
            (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              onClick={onItemClick}
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
      <Link
        href="/"
        onClick={onItemClick}
        className="flex min-h-11 items-center gap-3 rounded-sm border-l-2 border-transparent px-3 py-2 text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <Home className="h-4 w-4" />
        {t.admin?.backToSite || "返回前台"}
      </Link>
    </div>
  );

  return (
    <>
      <div className="fixed bottom-4 left-4 z-40 lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button size="icon" aria-label="打开管理后台导航" className="shadow-lg">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            closeLabel="关闭管理后台导航"
            closeButtonClassName="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-sidebar-foreground"
            className="w-[min(88vw,18rem)] gap-0 border-r-2 border-signal-amber bg-sidebar p-0 text-sidebar-foreground"
          >
            <SheetHeader className="border-b border-sidebar-border p-4 pr-14 text-left">
              <SheetTitle className="font-display text-xl text-sidebar-foreground">
                {t.admin?.title || "管理后台"}
              </SheetTitle>
              <SheetDescription className="text-sidebar-foreground/70">
                选择当前账户有权访问的管理模块。
              </SheetDescription>
            </SheetHeader>
            <NavContent
              showHeading={false}
              onItemClick={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>

      <aside className="hidden min-h-[calc(100svh-4.625rem)] w-64 flex-shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:sticky lg:top-[4.625rem] lg:block lg:h-[calc(100svh-4.625rem)] lg:self-start lg:overflow-y-auto">
        <NavContent />
      </aside>
    </>
  );
}
