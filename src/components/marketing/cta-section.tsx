"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Phone } from "lucide-react";
import { siteLinks } from "@/config/site-config";
import { useLocale } from "@/i18n/locale-context";

export function CTASection() {
  const { t } = useLocale();

  return (
    <section className="py-16 md:py-24 bg-primary text-primary-foreground">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold">
            {t.cta.title}
          </h2>
          <p className="text-lg opacity-90">
            {t.cta.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild className="border-white/50 text-black hover:bg-white/10 hover:text-white backdrop-blur-sm">
              <Link href="/contact">
                {t.cta.button}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground hover:bg-primary-foreground hover:text-primary" asChild>
              <a href={`tel:${siteLinks.phone}`}>
                <Phone className="mr-2 h-4 w-4" />
                {siteLinks.phone}
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
