"use client";

import Image from "next/image";
import { CheckCircle, Users, Globe, Award, Target } from "lucide-react";
import { CTASection, StatsSection } from "@/components/marketing";
import { useLocale } from "@/i18n/locale-context";

export default function AboutPage() {
  const { t } = useLocale();

  // 从翻译文件获取数据
  const values = [
    {
      icon: Target,
      title: t.about.mission?.title || "使命",
      description: t.about.mission?.description || "",
    },
    {
      icon: Globe,
      title: t.about.vision?.title || "愿景",
      description: t.about.vision?.description || "",
    },
    {
      icon: Award,
      title: t.about.values?.title || "价值观",
      description: t.about.values?.description || "",
    },
  ];

  const milestones = (t.about.milestones as Array<{ year: string; event: string }>) || [];

  const advantages = (t.about.advantages as string[]) || [];
  return (
    <>
      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
                {t.about.badge}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Company Name
              </h1>
              <p className="text-lg text-muted-foreground mb-6">
                {t.about.intro}
              </p>
              <p className="text-muted-foreground">
                {t.about.introDetail}
              </p>
            </div>
            <div className="aspect-video rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Users className="h-32 w-32 text-primary/30" />
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t.about.valuesTitle}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <div key={value.title} className="text-center p-8 bg-muted/30 rounded-2xl">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <StatsSection />

      {/* Advantages */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">{t.about.advantagesTitle}</h2>
              <p className="text-muted-foreground mb-8">
                {t.about.advantagesSubtitle}
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {advantages.map((advantage) => (
                  <div key={advantage} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>{advantage}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="aspect-video rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Award className="h-24 w-24 text-primary/30" />
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t.about.historyTitle}</h2>
          </div>
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-primary/20" />
              {milestones.map((milestone, index) => (
                <div key={milestone.year} className="relative pl-12 pb-8 last:pb-0">
                  <div className="absolute left-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                    {milestone.year.slice(-2)}
                  </div>
                  <div className="pt-1">
                    <div className="font-bold text-primary">{milestone.year}</div>
                    <p className="text-muted-foreground">{milestone.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CTASection />
    </>
  );
}
