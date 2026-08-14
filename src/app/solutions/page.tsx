"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Package, Truck, RefreshCw, CheckCircle, Warehouse, Ship, Globe, ShoppingCart, Plane, Zap } from "lucide-react";
import { CTASection } from "@/components/marketing";
import { useLocale } from "@/i18n/locale-context";
import { getSolutionsConfig, solutionConfigs } from "@/config/site-config";

const iconMap: Record<string, React.ElementType> = {
  Package: Package,
  Truck: Truck,
  RefreshCw: RefreshCw,
  Warehouse: Warehouse,
  Ship: Ship,
  Globe: Globe,
  ShoppingCart: ShoppingCart,
  Plane: Plane,
  Zap: Zap,
};

export default function SolutionsPage() {
  const { t } = useLocale();

  // 使用统一的配置函数获取解决方案数据
  const solutions = getSolutionsConfig(t);

  return (
    <>
      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {t.solutions?.pageTitle || t.solutions?.title || "物流解决方案"}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t.solutions?.pageSubtitle || t.solutions?.subtitle || "全方位的跨境物流解决方案"}
            </p>
          </div>
        </div>
      </section>

      {/* Solutions Grid */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {solutions.map((solution) => {
              const Icon = iconMap[solution.icon] || Package;
              
              return (
                <Link
                  key={solution.id}
                  href={solution.href}
                  className="group block p-6 rounded-2xl border bg-card hover:shadow-lg hover:border-primary/50 transition-all duration-300"
                >
                  {solution.image ? (
                    <div className="aspect-video relative rounded-xl overflow-hidden mb-4">
                      <Image
                        src={solution.image}
                        alt={solution.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
                      <Icon className="h-16 w-16 text-primary/40" />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">
                      {solution.title}
                    </h3>
                  </div>
                  <p className="text-muted-foreground text-sm line-clamp-3">
                    {solution.description}
                  </p>
                  <div className="mt-4 flex items-center text-primary text-sm font-medium">
                    {t.common?.learnMore || "了解更多"}
                    <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Solutions Detail List */}
      <section className="py-16 md:py-24 bg-muted/50">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">
            {t.solutions?.title || "我们的解决方案"}
          </h2>
          <div className="space-y-16">
            {solutions.map((solution, index) => {
              const Icon = iconMap[solution.icon] || Package;
              const isReversed = index % 2 === 1;
              
              return (
                <div
                  key={`detail-${solution.id}`}
                  className={`grid lg:grid-cols-2 gap-12 items-center ${
                    isReversed ? "lg:flex-row-reverse" : ""
                  }`}
                >
                  <div className={isReversed ? "lg:order-2" : ""}>
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4">{solution.title}</h3>
                    <p className="text-muted-foreground mb-6">
                      {solution.description}
                    </p>
                    <ul className="grid sm:grid-cols-2 gap-3 mb-8">
                      {solution.features.slice(0, 6).map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-4">
                      <Button asChild>
                        <Link href={solution.href}>
                          {t.common?.learnMore || "了解更多"}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href="/contact">
                          {t.common?.contactNow || "立即咨询"}
                        </Link>
                      </Button>
                    </div>
                  </div>
                  <div className={`${isReversed ? "lg:order-1" : ""}`}>
                    {solution.image ? (
                      <div className="aspect-video relative rounded-2xl overflow-hidden shadow-lg">
                        <Image
                          src={solution.image}
                          alt={solution.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <Icon className="h-24 w-24 text-primary/30" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <CTASection />
    </>
  );
}
