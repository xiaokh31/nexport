"use client";

import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuoteForm } from "@/components/forms";
import { siteLinks } from "@/config/site-config";
import { useLocale } from "@/i18n/locale-context";

export default function ContactPage() {
  const { t } = useLocale();

  const contactInfo = [
    {
      icon: Mail,
      title: t.contact?.email || "邮箱",
      content: siteLinks.email,
      href: `mailto:${siteLinks.email}`,
    },
    {
      icon: Phone,
      title: t.contact?.phone || "电话",
      content: siteLinks.phone,
      href: `tel:${siteLinks.phone}`,
    },
    {
      icon: MapPin,
      title: t.contact?.address || "地址",
      content: siteLinks.address,
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(siteLinks.address)}`,
      isExternal: true,
    },
    {
      icon: Clock,
      title: t.contact?.workHours || "工作时间",
      content: t.contact?.workHoursValue || "周一至周五 9:00 - 18:00 (EST)",
    }
  ];
  return (
    <>
      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {t.contact?.title || "联系我们"}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t.contact?.pageSubtitle || "无论您有任何物流需求或疑问，我们的专业团队随时为您服务。填写下方表单或直接联系我们，获取专属的物流解决方案。"}
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Contact Info */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">{t.contact?.contactInfo || "联系方式"}</h2>
              {contactInfo.map((info) => {
                const Icon = info.icon;
                return (
                  <div key={info.title} className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">{info.title}</h3>
                      {info.href ? (
                        <a
                          href={info.href}
                          className="text-muted-foreground hover:text-primary hover:underline"
                          target={info.isExternal ? "_blank" : undefined}
                          rel={info.isExternal ? "noopener noreferrer" : undefined}
                        >
                          {info.content}
                        </a>
                      ) : (
                        <p className="text-muted-foreground">{info.content}</p>
                      )}
                    </div>
                  </div>
                );
              })}


              {/* Map Placeholder */}
              <div className="mt-8 aspect-video rounded-xl bg-muted/50 flex items-center justify-center">
                <MapPin className="h-12 w-12 text-muted-foreground/50" />
              </div>
            </div>

            {/* Quote Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">{t.common?.getQuote || "获取报价"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <QuoteForm />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
