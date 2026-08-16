"use client";

import Link from "next/link";
import { RegisterForm } from "./register-form";
import { useLocale } from "@/i18n/locale-context";
import { AuthShell } from "@/components/auth/auth-shell";

export default function RegisterPage() {
  const { t } = useLocale();

  return (
    <AuthShell>
      <div className="border-t-4 border-signal-amber pt-5">
        <p className="font-utility text-xs font-semibold uppercase tracking-[0.16em] text-steel-blue">
          {t.auth.registerTitle}
        </p>
        <h2 className="font-display mt-2 text-3xl font-bold">{t.auth.createAccount}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t.auth.registerHint}</p>
        <div className="mt-7">
          <RegisterForm />
        </div>
        <div className="mt-6 border-t border-border pt-5 text-center text-sm">
          <span className="text-muted-foreground">{t.auth.hasAccount}</span>{" "}
          <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
            {t.auth.loginNow}
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
