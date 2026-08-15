"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/i18n/locale-context";

type VerificationState =
  | "IDLE"
  | "READY"
  | "VERIFYING"
  | "SUCCESS"
  | "SENT"
  | "RESENT"
  | "EXPIRED"
  | "USED"
  | "INVALID"
  | "ERROR";

export function VerifyEmailClient() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() || "";
  const sent = searchParams.get("sent") === "true";
  const [state, setState] = useState<VerificationState>(
    token ? "READY" : sent ? "SENT" : "IDLE",
  );
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setEmail(sessionStorage.getItem("pending-verification-email") || "");
  }, []);

  async function verifyEmail() {
    if (!token) return;
    setState("VERIFYING");
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await response.json();
      if (response.ok) {
        sessionStorage.removeItem("pending-verification-email");
        setState("SUCCESS");
      } else if (result.status === "EXPIRED") {
        setState("EXPIRED");
      } else if (result.status === "USED") {
        setState("USED");
      } else if (result.status === "INVALID") {
        setState("INVALID");
      } else {
        setState("ERROR");
      }
    } catch {
      setState("ERROR");
    }
  }

  async function resendVerification() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setFormError(t.form.emailRequired);
      return;
    }
    setResending(true);
    setFormError(null);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      if (response.ok) {
        sessionStorage.setItem("pending-verification-email", normalizedEmail);
        setState("RESENT");
      } else {
        setFormError(t.auth.verificationFailed);
      }
    } catch {
      setFormError(t.auth.verificationFailed);
    } finally {
      setResending(false);
    }
  }

  const stateMessage: Partial<Record<VerificationState, string>> = {
    IDLE: t.auth.verifyEmailDescription,
    READY: t.auth.verificationReady,
    VERIFYING: t.auth.verifyingEmail,
    SUCCESS: t.auth.emailVerifiedDescription,
    SENT: t.auth.verificationEmailSentDescription,
    RESENT: t.auth.verificationRequestAccepted,
    EXPIRED: t.auth.verificationExpired,
    USED: t.auth.verificationUsed,
    INVALID: t.auth.verificationInvalid,
    ERROR: t.auth.verificationFailed,
  };
  const failed = ["EXPIRED", "USED", "INVALID", "ERROR"].includes(state);

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          {failed ? (
            <AlertCircle className="h-6 w-6 text-destructive" />
          ) : (
            <MailCheck className="h-6 w-6 text-primary" />
          )}
        </div>
        <CardTitle>
          {state === "SUCCESS" ? t.auth.emailVerified : t.auth.verifyEmailTitle}
        </CardTitle>
        <CardDescription>{stateMessage[state]}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {token && state !== "SUCCESS" && !["EXPIRED", "USED", "INVALID"].includes(state) && (
          <Button
            className="w-full"
            onClick={verifyEmail}
            disabled={state === "VERIFYING"}
          >
            {state === "VERIFYING" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.auth.verifyingEmail}
              </>
            ) : t.auth.verifyEmailAction}
          </Button>
        )}

        {state !== "SUCCESS" && (
          <div className="space-y-3 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="verification-email">{t.auth.email}</Label>
              <Input
                id="verification-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t.auth.emailPlaceholder}
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={resendVerification}
              disabled={resending}
            >
              {resending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.auth.resendingVerification}
                </>
              ) : t.auth.resendVerification}
            </Button>
          </div>
        )}

        <Button asChild variant={state === "SUCCESS" ? "default" : "ghost"} className="w-full">
          <Link href="/login">{t.auth.goToLogin}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
