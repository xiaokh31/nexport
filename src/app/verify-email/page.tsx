import { Suspense } from "react";
import type { Metadata } from "next";
import { VerifyEmailClient } from "./verify-email-client";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function VerifyEmailPage() {
  return (
    <div className="min-h-[calc(100vh-200px)] py-12">
      <div className="container max-w-md">
        <Suspense fallback={null}>
          <VerifyEmailClient />
        </Suspense>
      </div>
    </div>
  );
}
