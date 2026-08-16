"use client";

import Link from "next/link";
import { LoginForm } from "./login-form";
import { useLocale } from "@/i18n/locale-context";
import { AuthShell } from "@/components/auth/auth-shell";

export default function LoginPage() {
  const { t } = useLocale();

  return (
    <AuthShell>
      <div className="border-t-4 border-signal-amber pt-5">
        <p className="font-utility text-xs font-semibold uppercase tracking-[0.16em] text-steel-blue">
          {t.auth.loginTitle}
        </p>
        <h2 className="font-display mt-2 text-3xl font-bold">{t.auth.welcomeBack}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t.auth.loginHint}</p>
        <div className="mt-7">
          <LoginForm />
        </div>
        <div className="mt-6 border-t border-border pt-5 text-center text-sm">
          <span className="text-muted-foreground">{t.auth.noAccount}</span>{" "}
          <Link href="/register" className="font-semibold text-primary underline-offset-4 hover:underline">
            {t.auth.registerNow}
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
