"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";
import { useLocale } from "@/i18n/locale-context";

export default function LoginPage() {
  const { t } = useLocale();

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12">
      <div className="container max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t.auth.welcomeBack}</CardTitle>
            <CardDescription>
              {t.auth.loginHint}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">{t.auth.noAccount}</span>{" "}
              <Link href="/register" className="text-primary hover:underline">
                {t.auth.registerNow}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
