"use client";

import { useEffect, useState, useRef } from "react";
import { useLocale } from "@/i18n/locale-context";
import { getStatsConfig } from "@/config/site-config";

function AnimatedNumber({ value, suffix = "" }: { value: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const numericValue = parseInt(value.replace(/[^0-9]/g, ""));

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const duration = 2000;
            const steps = 60;
            const increment = numericValue / steps;
            let current = 0;

            const timer = setInterval(() => {
              current += increment;
              if (current >= numericValue) {
                setCount(numericValue);
                clearInterval(timer);
              } else {
                setCount(Math.floor(current));
              }
            }, duration / steps);

            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [numericValue]);

  return (
    <div ref={ref} className="text-4xl md:text-5xl font-bold text-primary">
      {count.toLocaleString()}{suffix}
    </div>
  );
}

export function StatsSection() {
  const { t } = useLocale();
  const stats = getStatsConfig(t);

  return (
    <section className="py-16 md:py-24 bg-muted/50">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t.stats.title}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t.stats.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="text-center p-6 bg-background rounded-xl shadow-sm"
            >
              <AnimatedNumber value={stat.value} suffix={stat.suffix} />
              <div className="text-lg font-medium mt-2">{stat.label}</div>
              <div className="text-sm text-muted-foreground">{stat.description}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
