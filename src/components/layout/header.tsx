"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  BarChart3,
  Bell,
  ChevronDown,
  FileText,
  LogOut,
  Menu,
  Settings,
  User,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { siteInfo, solutionConfigs } from "@/config/site-config";
import { getSolutionUiContent } from "@/config/marketing-content";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { useLocale } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "./language-switcher";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const { locale, t } = useLocale();
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";
  const { profile: adminAccess } = useAdminAccess(session?.user?.id);
  const adminPath = adminAccess?.defaultPath;
  const hasAdminAccess = Boolean(adminPath);
  const solutionNavItems = [
    {
      title: t.nav.allSolutions || "全部解决方案",
      href: "/solutions",
    },
    ...solutionConfigs.map(({ key, slug }) => ({
      title: getSolutionUiContent(locale, key).title,
      href: `/solutions/${slug}`,
    })),
  ];
  const mainNav = [
    { title: t.nav.home, href: "/" },
    {
      title: t.nav.solutions || t.nav.services,
      href: "/solutions",
      children: solutionNavItems,
    },
    { title: t.nav.about, href: "/about" },
    { title: t.nav.news, href: "/news" },
    { title: t.nav.contact, href: "/contact" },
  ];
  const accountLabel = session?.user?.name || t.user.center;

  return (
    <header
      data-site-header
      className="sticky top-0 z-50 w-full border-b-2 border-signal-amber bg-dock-navy text-paper-white shadow-[0_8px_24px_rgba(16,38,50,0.12)]"
    >
      <div className="container flex min-h-18 items-center gap-2 py-2 sm:gap-3">
        <Link
          href="/"
          className="mr-auto flex min-w-0 items-center gap-2 rounded-sm focus-visible:outline-paper-white"
          aria-label={`${siteInfo.name}，${t.nav.home}`}
        >
          <span
            aria-hidden="true"
            className="relative grid size-9 shrink-0 place-items-center border border-paper-white/55"
          >
            <span className="h-5 w-3 border-x-2 border-signal-amber" />
            <span className="absolute inset-x-1.5 bottom-1.5 border-b border-paper-white/70" />
          </span>
          <span className="font-display truncate text-xl font-bold tracking-wide text-paper-white sm:text-2xl">
            {siteInfo.name}
          </span>
        </Link>

        <NavigationMenu className="hidden xl:flex" aria-label="主要导航">
          <NavigationMenuList>
            {mainNav.map((item) =>
              item.children ? (
                <NavigationMenuItem key={item.title}>
                  <NavigationMenuTrigger className="bg-transparent text-paper-white hover:bg-paper-white/10 hover:text-paper-white focus:bg-paper-white/10 focus:text-paper-white data-[state=open]:bg-paper-white/10 data-[state=open]:text-paper-white focus-visible:outline-paper-white">
                    {item.title}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[32rem] grid-cols-2 gap-1 p-3">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <NavigationMenuLink asChild>
                            <Link
                              href={child.href}
                              className="min-h-11 rounded-sm border-l-2 border-transparent p-3 leading-snug hover:border-signal-amber hover:bg-accent focus:border-signal-amber focus:bg-accent"
                            >
                              <span className="text-sm font-medium">{child.title}</span>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ) : (
                <NavigationMenuItem key={item.href}>
                  <NavigationMenuLink asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        navigationMenuTriggerStyle(),
                        "bg-transparent text-paper-white hover:bg-paper-white/10 hover:text-paper-white focus:bg-paper-white/10 focus:text-paper-white focus-visible:outline-paper-white",
                      )}
                    >
                      {item.title}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ),
            )}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <LanguageSwitcher className="border-paper-white/20 text-paper-white hover:border-paper-white/60 hover:bg-paper-white/10 hover:text-paper-white" />

          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="border-paper-white/20 px-2 text-paper-white hover:border-paper-white/60 hover:bg-paper-white/10 hover:text-paper-white"
                  aria-label={`${t.user.center}：${accountLabel}`}
                >
                  <Avatar className="size-7">
                    <AvatarImage
                      src={session?.user?.image || undefined}
                      alt={accountLabel}
                    />
                    <AvatarFallback className="bg-paper-white text-xs text-dock-navy">
                      {accountLabel.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden 2xl:inline">{accountLabel}</span>
                  <ChevronDown className="hidden size-4 2xl:block" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="break-all">
                  {session?.user?.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {hasAdminAccess && (
                  <DropdownMenuItem asChild>
                    <Link href={adminPath || "/admin"}>
                      <Settings aria-hidden="true" />
                      {t.admin.title}
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">
                    <BarChart3 aria-hidden="true" />
                    {t.dashboard.title}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/user">
                    <User aria-hidden="true" />
                    {t.user.center}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/user/quotes">
                    <FileText aria-hidden="true" />
                    {t.user.myQuotes}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/user/notifications">
                    <Bell aria-hidden="true" />
                    {t.messages.notifications}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  <LogOut aria-hidden="true" />
                  {t.user.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="ghost"
              asChild
              className="border-paper-white/20 px-2 text-paper-white hover:border-paper-white/60 hover:bg-paper-white/10 hover:text-paper-white sm:px-3"
            >
              <Link href="/login" aria-label={t.common.login}>
                <User aria-hidden="true" />
                <span className="hidden lg:inline">{t.common.login}</span>
              </Link>
            </Button>
          )}

          <Button asChild className="hidden xl:inline-flex">
            <Link href="/contact">{t.common.getQuote}</Link>
          </Button>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="border-paper-white/20 text-paper-white hover:border-paper-white/60 hover:bg-paper-white/10 hover:text-paper-white xl:hidden"
                aria-label={t.common.openMenu}
              >
                <Menu className="size-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              closeLabel={t.common.closeMenu}
              closeButtonClassName="text-paper-white hover:bg-paper-white/10 hover:text-paper-white focus-visible:ring-paper-white"
              className="w-[min(92vw,24rem)] gap-0 border-l-2 border-signal-amber bg-paper-white p-0"
            >
              <SheetHeader className="border-b bg-dock-navy px-5 py-5 pr-16 text-left text-paper-white">
                <SheetTitle className="font-display text-xl text-paper-white">
                  {t.common.navigation}
                </SheetTitle>
                <SheetDescription className="text-paper-white/75">
                  {t.common.navigationDescription}
                </SheetDescription>
              </SheetHeader>

              <nav
                aria-label="移动端主要导航"
                className="flex flex-1 flex-col gap-1 overflow-y-auto p-4"
              >
                {mainNav.map((item) => (
                  <div key={item.href}>
                    {item.children ? (
                      <div className="border-b border-border pb-3">
                        <Link
                          href={item.href}
                          className="flex min-h-11 items-center border-l-2 border-signal-amber px-3 font-semibold"
                          onClick={() => setIsOpen(false)}
                        >
                          {item.title}
                        </Link>
                        <div className="grid gap-1 pl-3">
                          {item.children.slice(1).map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className="flex min-h-11 items-center rounded-sm px-3 text-sm text-steel-blue hover:bg-concrete hover:text-dock-navy"
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
                        className="flex min-h-11 items-center rounded-sm px-3 font-medium hover:bg-concrete"
                        onClick={() => setIsOpen(false)}
                      >
                        {item.title}
                      </Link>
                    )}
                  </div>
                ))}

                <div className="mt-auto space-y-2 border-t pt-4">
                  <Button asChild className="w-full">
                    <Link href="/contact" onClick={() => setIsOpen(false)}>
                      {t.common.getQuote}
                    </Link>
                  </Button>
                  {!isLoggedIn && (
                    <Button variant="outline" asChild className="w-full">
                      <Link href="/register" onClick={() => setIsOpen(false)}>
                        {t.common.register}
                      </Link>
                    </Button>
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
