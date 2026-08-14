"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Truck, RefreshCw, BarChart3, Loader2, FileText, User, Plus } from "lucide-react";
import { useLocale } from "@/i18n/locale-context";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useLocale();

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="container py-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const stats = [
    { icon: Package, label: t.dashboard.pendingOrders, value: "0", color: "text-blue-500" },
    { icon: Truck, label: t.dashboard.inTransit, value: "0", color: "text-green-500" },
    { icon: RefreshCw, label: t.dashboard.pendingReturns, value: "0", color: "text-orange-500" },
    { icon: BarChart3, label: t.dashboard.monthlyOrders, value: "0", color: "text-purple-500" },
  ];

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t.dashboard.title}</h1>
        <p className="text-muted-foreground">{t.dashboard.description}</p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{t.dashboard.quickActions}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button asChild>
              <Link href="/contact">
                <Plus className="h-4 w-4 mr-2" />
                {t.dashboard.newQuote}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/user/quotes">
                <FileText className="h-4 w-4 mr-2" />
                {t.dashboard.viewQuotes}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/user/profile">
                <User className="h-4 w-4 mr-2" />
                {t.dashboard.editProfile}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content Placeholders */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.recentOrders}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t.dashboard.noOrderData}</p>
              <p className="text-sm">{t.dashboard.connectDbHint}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.inventoryOverview}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t.dashboard.noInventoryData}</p>
              <p className="text-sm">{t.dashboard.connectDbHint}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
