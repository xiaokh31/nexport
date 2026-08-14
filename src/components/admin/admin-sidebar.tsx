"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
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
  ScanLine,
  LucideIcon,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useLocale } from "@/i18n/locale-context";
import { canAccessModule, AdminModule, UserRole } from "@/lib/permissions";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  module: AdminModule;
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { t } = useLocale();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const userRole = (session?.user?.role || 'CUSTOMER') as UserRole;
  const canManageArticles = session?.user?.canManageArticles || false;

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
      title: t.admin?.messages || "消息管理",
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
      title: t.admin?.skuScan?.title || "扫码对账",
      href: "/admin/sku-scan",
      icon: ScanLine,
      module: 'skuScan',
    },
    {
      title: t.admin?.settings || "系统设置",
      href: "/admin/settings",
      icon: Settings,
      module: 'settings',
    },
  ];

  // 根据用户角色过滤可访问的菜单项
  const filteredNavItems = allNavItems.filter(item => 
    canAccessModule(userRole, item.module, canManageArticles)
  );

  // 导航内容组件
  const NavContent = ({ onItemClick }: { onItemClick?: () => void }) => (
    <div className="p-4">
      <h2 className="font-bold text-lg mb-4">{t.admin?.title || "管理后台"}</h2>
      <nav className="space-y-1">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || 
            (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onItemClick}
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
      <Link
        href="/"
        onClick={onItemClick}
        className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-muted"
      >
        <Home className="h-4 w-4" />
        {t.admin?.backToSite || "返回前台"}
      </Link>
    </div>
  );

  return (
    <>
      {/* 移动端浮动菜单按钮 */}
      <div className="lg:hidden fixed bottom-4 left-4 z-50">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button size="icon" className="h-12 w-12 rounded-full shadow-lg">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <NavContent onItemClick={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* 桌面端侧边栏 */}
      <aside className="hidden lg:block w-64 flex-shrink-0 bg-muted/30 min-h-[calc(100vh-4rem)]">
        <NavContent />
      </aside>
    </>
  );
}
