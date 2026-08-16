"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { registerFormSchema, RegisterFormValues } from "@/lib/validations";
import { Loader2 } from "lucide-react";
import { useLocale } from "@/i18n/locale-context";
import { CaptchaUnavailable, CaptchaV2Checkbox } from "@/components/captcha";
import { publicEnv } from "@/config/env/public";

export function RegisterForm() {
  const router = useRouter();
  const { t } = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  // Check if external reCAPTCHA is configured
  const recaptchaSiteKey = publicEnv.recaptchaSiteKey;

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      company: "",
      phone: "",
      captchaToken: undefined,
    },
  });

  async function onSubmit(data: RegisterFormValues) {
    if (!captchaToken) {
      setError(t.auth?.captchaRequired || "Please complete the verification first");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, captchaToken }),
      });
      const result = await response.json();

      if (response.ok) {
        sessionStorage.setItem("pending-verification-email", data.email.trim().toLowerCase());
        router.push("/verify-email?sent=true");
      } else {
        setError(response.status === 409 ? (result.error || t.auth.registerFailed) : t.auth.registerFailed);
      }
    } catch {
      setError(t.auth.registerFailed);
    } finally {
      setIsLoading(false);
      setCaptchaToken("");
      form.setValue("captchaToken", undefined);
      setCaptchaResetKey((value) => value + 1);
    }
  }

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
    form.setValue("captchaToken", token, { shouldValidate: true });
  };

  const handleCaptchaExpire = () => {
    setCaptchaToken("");
    form.setValue("captchaToken", undefined);
  };

  const handleCaptchaError = () => {
    handleCaptchaExpire();
    setError(t.auth?.captchaFailed || "Human verification failed. Please try again.");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div role="alert" aria-live="assertive" className="border-l-4 border-destructive bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.auth.name} *</FormLabel>
              <FormControl>
                <Input autoComplete="name" maxLength={100} aria-required="true" placeholder={t.auth.namePlaceholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.auth.email} *</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" maxLength={254} aria-required="true" placeholder={t.auth.emailPlaceholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.auth.password} *</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" aria-required="true" placeholder={t.auth.passwordPlaceholder} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.auth.confirmPassword} *</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" aria-required="true" placeholder={t.auth.confirmPasswordPlaceholder} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="company"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.auth.company}</FormLabel>
              <FormControl>
                <Input autoComplete="organization" maxLength={200} placeholder={t.auth.companyPlaceholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.auth.phone}</FormLabel>
              <FormControl>
                <Input type="tel" autoComplete="tel" maxLength={32} placeholder={t.auth.phonePlaceholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* CAPTCHA Verification */}
        <div className="max-w-full overflow-x-auto py-2" data-auth-captcha>
          {recaptchaSiteKey ? (
            <CaptchaV2Checkbox
              siteKey={recaptchaSiteKey}
              onVerify={handleCaptchaVerify}
              onError={handleCaptchaError}
              onExpire={handleCaptchaExpire}
              resetKey={captchaResetKey}
            />
          ) : (
            <CaptchaUnavailable
              message={t.auth?.captchaUnavailable || "Human verification is not configured."}
            />
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || !recaptchaSiteKey || !captchaToken}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span role="status" aria-live="polite">{t.auth.registering}</span>
            </>
          ) : (
            t.auth.register
          )}
        </Button>

        {recaptchaSiteKey && !captchaToken && (
          <p className="text-xs text-center text-muted-foreground">
            {t.auth?.captchaHint || "Please complete verification to enable register"}
          </p>
        )}
      </form>
    </Form>
  );
}
