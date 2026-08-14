"use client";

import { Shield, Clock, Globe, Headphones, Award, Zap } from "lucide-react";
import { useLocale } from "@/i18n/locale-context";

const featureIcons = [
  Shield,
  Clock,
  Globe,
  Headphones,
  Award,
  Zap,
];

export function FeaturesSection() {
  const { t } = useLocale();

  // 动态获取 features 翻译
  const features = [
    {
      icon: Shield,
      title: t.features.safe?.title || "安全可靠",
      description: t.features.safe?.description || "全程保险保障，货物安全无忧",
    },
    {
      icon: Clock,
      title: t.features.timely?.title || "时效稳定",
      description: t.features.timely?.description || "多渠道时效保证，准时交付",
    },
    {
      icon: Globe,
      title: t.features.global?.title || "全球覆盖",
      description: t.features.global?.description || "覆盖北美、欧洲、亚洲多个地区",
    },
    {
      icon: Headphones,
      title: t.features.service?.title || "专业服务",
      description: t.features.service?.description || "7x24小时客服支持，实时跟踪",
    },
    {
      icon: Award,
      title: t.features.quality?.title || "品质保证",
      description: t.features.quality?.description || "严格的质量管控体系",
    },
    {
      icon: Zap,
      title: t.features.efficient?.title || "高效处理",
      description: t.features.efficient?.description || "高效处理，快速出库",
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t.features.title}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t.features.subtitle}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="flex gap-4 p-6 bg-background rounded-xl hover:shadow-md transition-shadow"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
