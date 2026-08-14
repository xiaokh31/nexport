"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Menu, X, ChevronDown, Phone, Mail, User, LogOut, Settings, Bell, FileText, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSiteConfig, solutionConfigs } from "@/config/site-config";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "./language-switcher";
import { useLocale } from "@/i18n/locale-context";
import { canAccessAdmin, UserRole } from "@/lib/permissions";



export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLocale();
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";
  // 检查是否有后台管理权限 - 使用统一的权限函数
  const userRole = session?.user?.role as UserRole | undefined;
  // 检查是否是管理员 - 支持多种管理角色
  const isAdmin = userRole ? canAccessAdmin(userRole) : false;
  
  const siteConfig = getSiteConfig(t);

  // 使用 solutionConfigs 动态生成解决方案导航菜单
  const solutionNavItems = [
    {
      title: t.nav.allSolutions || "全部解决方案",
      href: "/solutions",
      isHighlight: true,
    },
    ...solutionConfigs.map(({ key, slug }) => ({
      title: (t.solutions?.[key] as { title: string } | undefined)?.title || key,
      href: `/solutions/${slug}`,
    })),
  ];

  // 从翻译文件动态获取导航项
  const mainNav = [
    {
      title: t.nav.home,
      href: "/",
    },
    {
      title: t.nav.solutions || t.nav.services,
      href: "/solutions",
      children: solutionNavItems,
    },
    {
      title: t.nav.about,
      href: "/about",
    },
    {
      title: t.nav.news,
      href: "/news",
    },
    {
      title: t.nav.contact,
      href: "/contact",
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Top Bar */}
      <div className="hidden md:block border-b bg-primary text-primary-foreground">
        <div className="container flex h-10 items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <a href={`mailto:${siteConfig.links.email}`} className="flex items-center gap-2 hover:opacity-80">
              <Mail className="h-4 w-4" />
              {siteConfig.links.email}
            </a>
            <a href={`tel:${siteConfig.links.phone}`} className="flex items-center gap-2 hover:opacity-80">
              <Phone className="h-4 w-4" />
              {siteConfig.links.phone}
            </a>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:opacity-80">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={session?.user?.image || undefined} />
                      <AvatarFallback className="bg-primary-foreground text-primary text-xs">
                        {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{session?.user?.name || t.user.center}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>{session?.user?.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isAdmin && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="cursor-pointer">
                          <Settings className="mr-2 h-4 w-4" />
                          {t.admin.title}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      {t.dashboard.title}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/user" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      {t.user.center}
                    </Link>
                  </DropdownMenuItem>
                  {/* <DropdownMenuItem asChild>
                    <Link href="/user/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      {t.user.profile}
                    </Link>
                  </DropdownMenuItem> */}
                  <DropdownMenuItem asChild>
                    <Link href="/user/quotes" className="cursor-pointer">
                      <FileText className="mr-2 h-4 w-4" />
                      {t.user.myQuotes}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/user/notifications" className="cursor-pointer">
                      <Bell className="mr-2 h-4 w-4" />
                      {t.messages.notifications}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-red-600"
                    onClick={() => signOut({ callbackUrl: '/' })}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {t.user.logout}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/login" className="hover:underline">
                  {t.common.login}
                </Link>
                <span>/</span>
                <Link href="/register" className="hover:underline">
                  {t.common.register}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-2xl font-bold text-primary">{siteConfig.name}</span>
        </Link>

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            {mainNav.map((item) =>
              item.children ? (
                <NavigationMenuItem key={item.title}>
                  <NavigationMenuTrigger>{item.title}</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2">
                      {item.children.map((child) => (
                        <li key={child.title}>
                          <NavigationMenuLink asChild>
                            <Link
                              href={child.href}
                              className={cn(
                                "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                              )}
                            >
                              <div className="text-sm font-medium leading-none">
                                {child.title}
                              </div>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ) : (
                <NavigationMenuItem key={item.title}>
                  <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                    <Link href={item.href}>
                      {item.title}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              )
            )}
          </NavigationMenuList>
        </NavigationMenu>

        {/* CTA Button + Language Switcher */}
        <div className="hidden md:flex items-center gap-2">
          <LanguageSwitcher />
          <Button asChild>
            <Link href="/contact">{t.common.getQuote}</Link>
          </Button>
        </div>

        {/* 移动端右侧按钮区域 */}
        <div className="flex md:hidden items-center gap-2">
          {/* 移动端登录/用户入口 - 下拉菜单 */}
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="focus:outline-none">
                  <Avatar className="h-8 w-8 border-2 border-primary">
                    <AvatarImage src={session?.user?.image || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>{session?.user?.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        {t.admin.title}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="cursor-pointer">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    {t.dashboard.title}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/user" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    {t.user.center}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-red-600"
                  onClick={() => signOut({ callbackUrl: '/' })}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t.user.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">
                <User className="h-4 w-4 mr-1" />
                {t.common.login}
              </Link>
            </Button>
          )}
          
          {/* 汉堡菜单按钮 */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">{t.common.openMenu}</span>
              </Button>
            </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px] flex flex-col">
            <nav className="flex flex-col gap-4 mt-8 flex-1 overflow-y-auto">
              {/* 移动端语言切换 */}
              <div className="flex items-center justify-between pb-4 border-b">
                <span className="text-sm font-medium text-muted-foreground">语言 / Language</span>
                <LanguageSwitcher />
              </div>
              {mainNav.map((item) => (
                <div key={item.title}>
                  {item.children ? (
                    <div className="space-y-2">
                      <span className="font-medium">{item.title}</span>
                      <div className="pl-4 space-y-2">
                        {item.children.map((child) => (
                          <Link
                            key={child.title}
                            href={child.href}
                            className="block text-muted-foreground hover:text-foreground"
                            onClick={() => setIsOpen(false)}
                          >
                            {child.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      className="font-medium hover:text-primary"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.title}
                    </Link>
                  )}
                </div>
              ))}
              <div className="pt-4 space-y-2">
                <Button asChild className="w-full">
                  <Link href="/contact" onClick={() => setIsOpen(false)}>
                    {t.common.getQuote}
                  </Link>
                </Button>
                {isLoggedIn ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={session?.user?.image || undefined} />
                        <AvatarFallback>{session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="text-sm">
                        <div className="font-medium">{session?.user?.name}</div>
                        <div className="text-muted-foreground text-xs">{session?.user?.email}</div>
                      </div>
                    </div>
                    {isAdmin && (
                      <Button variant="outline" asChild className="w-full justify-start">
                        <Link href="/admin" onClick={() => setIsOpen(false)}>
                          <Settings className="mr-2 h-4 w-4" />
                          {t.admin.title}
                        </Link>
                      </Button>
                    )}
                    <Button variant="outline" asChild className="w-full justify-start">
                      <Link href="/dashboard" onClick={() => setIsOpen(false)}>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        {t.dashboard.title}
                      </Link>
                    </Button>
                    <Button variant="outline" asChild className="w-full justify-start">
                      <Link href="/user" onClick={() => setIsOpen(false)}>
                        <User className="mr-2 h-4 w-4" />
                        {t.user.center}
                      </Link>
                    </Button>
                    {/* <Button variant="outline" asChild className="w-full justify-start">
                      <Link href="/user/profile" onClick={() => setIsOpen(false)}>
                        <User className="mr-2 h-4 w-4" />
                        {t.user.profile}
                      </Link>
                    </Button> */}
                    <Button variant="outline" asChild className="w-full justify-start">
                      <Link href="/user/quotes" onClick={() => setIsOpen(false)}>
                        <FileText className="mr-2 h-4 w-4" />
                        {t.user.myQuotes}
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-red-600 hover:text-red-600"
                      onClick={() => {
                        setIsOpen(false);
                        signOut({ callbackUrl: '/' });
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {t.user.logout}
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" asChild className="flex-1">
                      <Link href="/login" onClick={() => setIsOpen(false)}>
                        {t.common.login}
                      </Link>
                    </Button>
                    <Button variant="outline" asChild className="flex-1">
                      <Link href="/register" onClick={() => setIsOpen(false)}>
                        {t.common.register}
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
        </div>
      </div>
    </header>
  );
}
