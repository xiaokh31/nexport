"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
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
import { loginFormSchema, LoginFormValues } from "@/lib/validations";
import { Loader2 } from "lucide-react";
import { useLocale } from "@/i18n/locale-context";
import { SimpleMathCaptcha, CaptchaV2Checkbox } from "@/components/captcha";
import { publicEnv } from "@/config/env/public";

export function LoginForm() {
  const router = useRouter();
  const { t } = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);

  // Check if external reCAPTCHA is configured
  const recaptchaSiteKey = publicEnv.recaptchaSiteKey;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormValues) {
    if (!isCaptchaVerified) {
      setError(t.auth?.captchaRequired || "Please complete the verification first");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      setError(t.auth.loginFailed);
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.auth.email}</FormLabel>
              <FormControl>
                <Input type="email" placeholder={t.auth.emailPlaceholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.auth.password}</FormLabel>
              <FormControl>
                <Input type="password" placeholder={t.auth.passwordPlaceholder} {...field} />
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
              {t.auth.loggingIn}
            </>
          ) : (
            t.auth.login
          )}
        </Button>

        {!isCaptchaVerified && (
          <p className="text-xs text-center text-muted-foreground">
            {t.auth?.captchaHint || "Please complete verification to enable login"}
          </p>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">{t.auth.or}</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          disabled={isLoading}
        >
          {t.auth.googleLogin}
        </Button>
      </form>
    </Form>
  );
}
