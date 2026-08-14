"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "./register-form";
import { useLocale } from "@/i18n/locale-context";

export default function RegisterPage() {
  const { t } = useLocale();

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12">
      <div className="container max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t.auth.createAccount}</CardTitle>
            <CardDescription>
              {t.auth.registerHint}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegisterForm />
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">{t.auth.hasAccount}</span>{" "}
              <Link href="/login" className="text-primary hover:underline">
                {t.auth.loginNow}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
