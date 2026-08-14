"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { useLocale } from "@/i18n/locale-context";

export function HeroSection() {
  const { t } = useLocale();

  return (
    <section className="relative min-h-[600px] md:min-h-[700px] overflow-hidden bg-gradient-to-br from-slate-950 via-slate-800 to-slate-700">

      {/* 多层渐变遮罩 - 确保文字在任何视频帧下都清晰可见 */}
      {/* 左侧深色渐变，保护文字区域 */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-black/10" />
      {/* 底部渐变，增强层次感 */}
      {/* <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" /> */}
      {/* 整体暗化层，确保对比度 */}
      {/* <div className="absolute inset-0 bg-black/0" /> */}
      
      {/* 内容区域 */}
      <div className="container relative z-10 py-20 md:py-32 flex items-center min-h-[600px] md:min-h-[700px]">
        <div className="grid lg:grid-cols-2 gap-12 items-center w-full">
          {/* Content */}
          <div className="space-y-8">
            {/* Badge - 半透明背景增强可见性 */}
            <div className="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium border border-white/30">
              {t.hero.badge}
            </div>
            
            {/* 标题 - 白色文字 + 文字阴影增强可读性 */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
              {t.hero.title1}
              <span className="text-white drop-shadow-[0_2px_4px_rgba(255,255,255,0.8)]"> {t.hero.title2} </span>
              {t.hero.title3}
            </h1>
            
            {/* 副标题 - 浅灰色文字 + 阴影 */}
            <p className="text-lg md:text-xl text-gray-200 max-w-lg drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              {t.hero.subtitle}
            </p>
            
            {/* 按钮组 */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" variant="outline" asChild className="text-white bg-transparent border-primary-foreground hover:bg-primary-foreground hover:text-primary">
                <Link href="/contact">
                  {t.hero.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-white/50 text-black hover:bg-white/10 hover:text-white backdrop-blur-sm">
                <Link href="/services">
                  {t.hero.learnMore}
                </Link>
              </Button>
            </div>

            {/* Trust Badges - 半透明背景卡片样式 */}
            <div className="flex flex-wrap items-center gap-4 md:gap-8 pt-4">
              <div className="text-center bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/20">
                <div className="text-2xl font-bold text-white drop-shadow-md">—</div>
                <div className="text-sm text-gray-300">{t.hero.customers}</div>
              </div>
              <div className="hidden md:block h-12 w-px bg-white/30" />
              <div className="text-center bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/20">
                <div className="text-2xl font-bold text-white drop-shadow-md">—</div>
                <div className="text-sm text-gray-300">{t.hero.experience}</div>
              </div>
              <div className="hidden md:block h-12 w-px bg-white/30" />
              <div className="text-center bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/20">
                <div className="text-2xl font-bold text-white drop-shadow-md">—</div>
                <div className="text-sm text-gray-300">{t.hero.delivery}</div>
              </div>
            </div>
          </div>

          {/* 右侧空白区域 - 保持布局平衡 */}
          <div className="hidden lg:block" />
        </div>
      </div>
    </section>
  );
}
