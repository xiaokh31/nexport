import { Suspense } from "react";
import type { Metadata } from "next";
import { VerifyEmailClient } from "./verify-email-client";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function VerifyEmailPage() {
  return (
    <div className="min-h-[calc(100vh-200px)] bg-concrete/55 py-12">
      <div className="container max-w-md">
        <Suspense fallback={
          <div role="status" aria-live="polite" aria-busy="true" className="flex min-h-64 items-center justify-center gap-3 border-2 border-dock-navy bg-paper-white text-sm text-muted-foreground">
            <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
            正在准备邮箱验证…
          </div>
        }>
          <VerifyEmailClient />
        </Suspense>
      </div>
    </div>
  );
}
