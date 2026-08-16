"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NewsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="bg-paper-white py-20 md:py-28">
      <div className="container">
        <div role="alert" aria-live="assertive" className="mx-auto max-w-2xl border-t-4 border-destructive bg-concrete p-7 md:p-10">
          <AlertTriangle className="size-9 text-destructive" aria-hidden="true" />
          <h1 className="mt-5 font-display text-4xl font-bold">暂时无法加载已发布内容</h1>
          <p className="mt-4 leading-7 text-muted-foreground">
            请重新加载；如果问题仍然存在，可以先返回首页或稍后再试。
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button onClick={reset}>
              <RefreshCw aria-hidden="true" />
              重新加载
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">返回首页</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
