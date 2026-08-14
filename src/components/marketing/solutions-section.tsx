"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Package, Truck, RefreshCw, CheckCircle, Warehouse, Ship, Globe, ShoppingCart } from "lucide-react";
import { useLocale } from "@/i18n/locale-context";
import { getSolutionsConfig } from "@/config/site-config";

const iconMap: Record<string, React.ElementType> = {
  Package: Package,
  Truck: Truck,
  RefreshCw: RefreshCw,
  Warehouse: Warehouse,
  Ship: Ship,
  Globe: Globe,
  ShoppingCart: ShoppingCart,
};

export function SolutionsSection() {
  const { t } = useLocale();
  const solutions = getSolutionsConfig(t);

  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t.solutions?.title || "我们的解决方案"}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t.solutions?.subtitle || "全方位的跨境物流解决方案，助力您的全球业务拓展"}
          </p>
        </div>

        {/* 显示前4个主要解决方案的卡片 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {solutions.slice(0, 7).map((solution) => {
            const Icon = iconMap[solution.icon] || Package;
            return (
              <Card
                key={solution.id}
                className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <CardHeader className="pb-3">
                  {solution.image ? (
                    <div className="aspect-video relative rounded-lg overflow-hidden mb-3">
                      <Image
                        src={solution.image}
                        alt={solution.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-3">
                      <Icon className="h-12 w-12 text-primary/40" />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">{solution.title}</CardTitle>
                  </div>
                  <CardDescription className="line-clamp-2">{solution.description}</CardDescription>
                </CardHeader>
                {/* <CardContent className="pt-0">
                  <ul className="space-y-1.5 mb-4">
                    {solution.features.slice(0, 3).map((feature: string, index: number) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        <span className="line-clamp-1">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" asChild className="w-full group-hover:bg-primary group-hover:text-primary-foreground" size="sm">
                    <Link href={solution.href}>
                      {t.common?.learnMore || "了解更多"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent> */}
              </Card>
            );
          })}
        </div>

        {/* 显示剩余解决方案的简洁列表 */}
        {/* {solutions.length > 4 && (
          <div className="mt-8 grid md:grid-cols-3 gap-4">
            {solutions.slice(4).map((solution) => {
              const Icon = iconMap[solution.icon] || Package;
              return (
                <Link
                  key={solution.id}
                  href={solution.href}
                  className="group flex items-center gap-4 p-4 rounded-xl border bg-card hover:shadow-md hover:border-primary/50 transition-all"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold group-hover:text-primary transition-colors">{solution.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">{solution.description}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </Link>
              );
            })}
          </div>
        )} */}

        <div className="text-center mt-12">
          <Button size="lg" asChild>
            <Link href="/solutions">
              {t.solutions?.viewAll || "查看全部解决方案"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
