"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Package, Truck, RefreshCw, CheckCircle, Warehouse, Ship, Globe, ShoppingCart, Phone, Mail, Plane, Zap } from "lucide-react";
import { CTASection } from "@/components/marketing";
import { useLocale } from "@/i18n/locale-context";
import { solutionConfigs, getSolutionBySlug, siteLinks } from "@/config/site-config";

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

// Next.js 15+ 中 params 是 Promise类型
interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function SolutionDetailPage({ params }: PageProps) {
  // 使用 React.use() 解析 params Promise
  const { slug } = use(params);
  const { t } = useLocale();
  
  // 使用统一的配置函数查找解决方案
  const config = getSolutionBySlug(slug);
  
  if (!config) {
    notFound();
  }
  
  // 从翻译获取数据
  const solutionData = t.solutions?.[config.key] as { 
    title: string; 
    description: string; 
    features?: string[] 
  } | undefined;
  
  if (!solutionData) {
    notFound();
  }
  
  const Icon = iconMap[config.icon] || Package;
  
  // 获取相邻的解决方案用于导航
  const currentIndex = solutionConfigs.findIndex(s => s.slug === slug);
  const prevSolution = currentIndex > 0 ? solutionConfigs[currentIndex - 1] : null;
  const nextSolution = currentIndex < solutionConfigs.length - 1 ? solutionConfigs[currentIndex + 1] : null;
  
  const getPrevTitle = () => {
    if (!prevSolution) return null;
    const data = t.solutions?.[prevSolution.key] as { title: string } | undefined;
    return data?.title || prevSolution.key;
  };
  
  const getNextTitle = () => {
    if (!nextSolution) return null;
    const data = t.solutions?.[nextSolution.key] as { title: string } | undefined;
    return data?.title || nextSolution.key;
  };

  return (
    <>
      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <Link 
              href="/solutions" 
              className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.solutions?.viewAll || "查看全部解决方案"}
            </Link>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Icon className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold">{solutionData.title}</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl">
              {solutionData.description}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Left: Image and Description */}
            <div className="lg:col-span-2 space-y-8">
              {/* Hero Image */}
              {config.image ? (
                <div className="aspect-video relative rounded-2xl overflow-hidden shadow-lg">
                  <Image
                    src={config.image}
                    alt={solutionData.title}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              ) : (
                <div className="aspect-video rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Icon className="h-32 w-32 text-primary/30" />
                </div>
              )}
              
              {/* Description */}
              <div className="prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">
                  {t.solutions?.aboutService || "服务介绍"}
                </h2>
                <p className="text-muted-foreground">
                  {solutionData.description}
                </p>
              </div>
              
              {/* Features */}
              <div>
                <h2 className="text-2xl font-bold mb-6">
                  {t.solutions?.keyFeatures || "核心特点"}
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {solutionData.features?.map((feature, index) => (
                    <div 
                      key={index}
                      className="flex items-start gap-3 p-4 rounded-xl bg-muted/50"
                    >
                      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Right: Contact Card */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                {/* Quick Contact Card */}
                <div className="rounded-2xl border bg-card p-6 shadow-sm">
                  <h3 className="text-xl font-semibold mb-4">
                    {t.contact?.contactInfo || "联系我们"}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-6">
                    {t.solutions?.contactHint || "有任何问题？我们的专业团队随时为您服务"}
                  </p>
                  <div className="space-y-4">
                    <Button asChild className="w-full">
                      <Link href="/contact">
                        {t.common?.getQuote || "获取报价"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" asChild className="w-full">
                      <a href={`tel:${siteLinks.phone}`}>
                        <Phone className="mr-2 h-4 w-4" />
                        {t.common?.contactNow || "立即咨询"}
                      </a>
                    </Button>
                  </div>
                </div>
                
                {/* Other Solutions */}
                <div className="rounded-2xl border bg-card p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    {t.solutions?.otherSolutions || "其他解决方案"}
                  </h3>
                  <div className="space-y-3">
                    {solutionConfigs
                      .filter(s => s.slug !== slug)
                      .slice(0, 4)
                      .map((s) => {
                        const data = t.solutions?.[s.key] as { title: string } | undefined;
                        const SIcon = iconMap[s.icon] || Package;
                        return (
                          <Link
                            key={s.slug}
                            href={`/solutions/${s.slug}`}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                          >
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <SIcon className="h-4 w-4 text-primary" />
                            </div>
                            <span className="text-sm font-medium">{data?.title || s.key}</span>
                          </Link>
                        );
                      })}
                  </div>
                  <Link 
                    href="/solutions" 
                    className="mt-4 flex items-center text-sm text-primary hover:underline"
                  >
                    {t.common?.viewAll || "查看全部"}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation */}
      <section className="py-8 border-t">
        <div className="container">
          <div className="flex justify-between items-center">
            {prevSolution ? (
              <Link 
                href={`/solutions/${prevSolution.slug}`}
                className="flex items-center gap-2 text-muted-foreground hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">{getPrevTitle()}</span>
              </Link>
            ) : (
              <div />
            )}
            {nextSolution ? (
              <Link 
                href={`/solutions/${nextSolution.slug}`}
                className="flex items-center gap-2 text-muted-foreground hover:text-primary"
              >
                <span className="text-sm">{getNextTitle()}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <div />
            )}
          </div>
        </div>
      </section>

      <CTASection />
    </>
  );
}
