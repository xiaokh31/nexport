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
import { SimpleMathCaptcha, CaptchaV2Checkbox } from "@/components/captcha";
import { publicEnv } from "@/config/env/public";

export function RegisterForm() {
  const router = useRouter();
  const { t } = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);

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
    },
  });

  async function onSubmit(data: RegisterFormValues) {
    if (!isCaptchaVerified) {
      setError(t.auth?.captchaRequired || "Please complete the verification first");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        router.push("/login?registered=true");
      } else {
        const result = await response.json();
        setError(result.error || t.auth.registerFailed);
      }
    } catch (error) {
      setError(t.auth.registerFailed);
    } finally {
      setIsLoading(false);
    }
  }

  const handleCaptchaVerify = (verified: boolean | string) => {
    // SimpleMathCaptcha passes boolean, CaptchaV2Checkbox passes token string
    setIsCaptchaVerified(typeof verified === "string" ? true : verified);
  };

  const handleCaptchaExpire = () => {
    setIsCaptchaVerified(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
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
                <Input placeholder={t.auth.namePlaceholder} {...field} />
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
                <Input type="email" placeholder={t.auth.emailPlaceholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.auth.password} *</FormLabel>
                <FormControl>
                  <Input type="password" placeholder={t.auth.passwordPlaceholder} {...field} />
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
                  <Input type="password" placeholder={t.auth.confirmPasswordPlaceholder} {...field} />
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
                <Input placeholder={t.auth.companyPlaceholder} {...field} />
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
                <Input placeholder={t.auth.phonePlaceholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* CAPTCHA Verification */}
        <div className="py-2">
          {recaptchaSiteKey ? (
            <CaptchaV2Checkbox
              siteKey={recaptchaSiteKey}
              onVerify={handleCaptchaVerify}
              onExpire={handleCaptchaExpire}
            />
          ) : (
            <SimpleMathCaptcha
              onVerify={handleCaptchaVerify}
              label={t.auth?.verifyHuman || "Verify you are human"}
            />
          )}
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isLoading || !isCaptchaVerified}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t.auth.registering}
            </>
          ) : (
            t.auth.register
          )}
        </Button>

        {!isCaptchaVerified && (
          <p className="text-xs text-center text-muted-foreground">
            {t.auth?.captchaHint || "Please complete verification to enable register"}
          </p>
        )}
      </form>
    </Form>
  );
}
