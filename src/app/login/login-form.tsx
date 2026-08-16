"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getProviders, signIn } from "next-auth/react";
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
import { CaptchaUnavailable, CaptchaV2Checkbox } from "@/components/captcha";
import { publicEnv } from "@/config/env/public";
import { EMAIL_NOT_VERIFIED_MESSAGE } from "@/lib/auth/messages";

export function LoginForm() {
  const router = useRouter();
  const { t } = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [googleLoginEnabled, setGoogleLoginEnabled] = useState(false);
  const [emailVerificationRequired, setEmailVerificationRequired] = useState(false);

  useEffect(() => {
    let active = true;

    void getProviders()
      .then((providers) => {
        if (active) setGoogleLoginEnabled(Boolean(providers?.google));
      })
      .catch(() => {
        if (active) setGoogleLoginEnabled(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Check if external reCAPTCHA is configured
  const recaptchaSiteKey = publicEnv.recaptchaSiteKey;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
      captchaToken: undefined,
    },
  });

  async function onSubmit(data: LoginFormValues) {
    if (!captchaToken) {
      setError(t.auth?.captchaRequired || "Please complete the verification first");
      return;
    }

    setIsLoading(true);
    setError(null);
    setEmailVerificationRequired(false);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        captchaToken,
        redirect: false,
      });

      if (result?.error) {
        if (result.error.includes(EMAIL_NOT_VERIFIED_MESSAGE)) {
          setError(t.auth.emailNotVerified);
          sessionStorage.setItem(
            "pending-verification-email",
            data.email.trim().toLowerCase(),
          );
          setEmailVerificationRequired(true);
        } else {
          setError(t.auth.loginFailed);
        }
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError(t.auth.loginFailed);
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.auth.email}</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" maxLength={254} aria-required="true" placeholder={t.auth.emailPlaceholder} {...field} />
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
                <Input type="password" autoComplete="current-password" aria-required="true" placeholder={t.auth.passwordPlaceholder} {...field} />
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
              <span role="status" aria-live="polite">{t.auth.loggingIn}</span>
            </>
          ) : (
            t.auth.login
          )}
        </Button>

        {recaptchaSiteKey && !captchaToken && (
          <p className="text-xs text-center text-muted-foreground">
            {t.auth?.captchaHint || "Please complete verification to enable login"}
          </p>
        )}

        {googleLoginEnabled && (
          <>
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
          </>
        )}

        {emailVerificationRequired && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => router.push("/verify-email")}
          >
            {t.auth.resendVerification}
          </Button>
        )}
      </form>
    </Form>
  );
}
