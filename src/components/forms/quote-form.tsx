"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { quoteFormSchema, QuoteFormValues } from "@/lib/validations";
import { Loader2, CheckCircle } from "lucide-react";
import { useLocale } from "@/i18n/locale-context";
import { getServiceTypeOptions } from "@/config/site-config";
import { isServiceType } from "@/config/quote";
import { CaptchaUnavailable, CaptchaV2Checkbox } from "@/components/captcha";
import { publicEnv } from "@/config/env/public";

export function QuoteForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successReference, setSuccessReference] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const { t } = useLocale();
  const { data: session } = useSession();

  const serviceOptions = getServiceTypeOptions(t);
  const recaptchaSiteKey = publicEnv.recaptchaSiteKey;

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      submissionKey: crypto.randomUUID(),
      name: "",
      email: "",
      phone: "",
      company: "",
      serviceType: undefined,
      origin: "",
      destination: "",
      cargoType: "",
      pieceCount: undefined,
      cartonCount: undefined,
      palletCount: undefined,
      weightValue: undefined,
      weightUnit: undefined,
      length: undefined,
      width: undefined,
      height: undefined,
      dimensionUnit: undefined,
      requestedDate: undefined,
      message: "",
      captchaToken: undefined,
    },
  });

  useEffect(() => {
    const requestedService = new URLSearchParams(window.location.search).get("service");
    if (isServiceType(requestedService)) {
      form.setValue("serviceType", requestedService);
    }
  }, [form]);

  async function onSubmit(data: QuoteFormValues) {
    if (!captchaToken) {
      setSubmitError(t.auth.captchaRequired);
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, captchaToken }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccessReference(result.data.reference);
        form.reset();
        form.setValue("submissionKey", crypto.randomUUID());
      } else {
        const fieldErrors = result.error?.fieldErrors as
          | Record<string, string[] | undefined>
          | undefined;
        if (fieldErrors) {
          const fields = Object.entries(fieldErrors).filter(
            (entry): entry is [keyof QuoteFormValues, string[]] =>
              Array.isArray(entry[1]) && entry[1].length > 0,
          );
          for (const [field, messages] of fields) {
            form.setError(field, { type: "server", message: messages[0] });
          }
          if (fields[0]) form.setFocus(fields[0][0]);
        }
        setSubmitError(result.error?.message || t.form.submitFailed);
      }
    } catch (error) {
      console.error("Error submitting quote:", error);
      setSubmitError(error instanceof Error ? error.message : t.form.submitFailed);
    } finally {
      setIsSubmitting(false);
      setCaptchaToken("");
      form.setValue("captchaToken", undefined);
      setCaptchaResetKey((value) => value + 1);
    }
  }

  function handleCaptchaExpire() {
    setCaptchaToken("");
    form.setValue("captchaToken", undefined);
  }

  if (successReference) {
    return (
      <div role="status" aria-live="polite" className="text-center py-12">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-2xl font-semibold mb-2">{t.form.submitSuccess}</h3>
        <p className="text-muted-foreground mb-6">
          {t.form.thankYou}
        </p>
        <p className="font-mono font-semibold mb-6">
          {t.form.reference}: {successReference}
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={() => setSuccessReference(null)}>{t.form.continueQuote}</Button>
          {session?.user && (
            <Button asChild variant="outline">
              <Link href="/user/quotes">{t.user.myQuotes}</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <input type="hidden" {...form.register("submissionKey")} />
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.contact.form.name} {t.form.required}</FormLabel>
                <FormControl>
                  <Input placeholder={t.user.namePlaceholder} {...field} />
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
                <FormLabel>{t.contact.form.email} {t.form.required}</FormLabel>
                <FormControl>
                  <Input type="email" placeholder={t.user.emailPlaceholder} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.contact.form.phone} {t.form.required}</FormLabel>
                <FormControl>
                  <Input placeholder={t.user.phonePlaceholder} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.contact.form.company} {t.form.optional}</FormLabel>
                <FormControl>
                  <Input placeholder={t.user.companyPlaceholder} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="serviceType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.contact.form.service} {t.form.required}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t.form.selectServiceType} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {serviceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="origin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.form.origin}</FormLabel>
                <FormControl>
                  <Input placeholder={t.form.originPlaceholder} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="destination"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.form.destination}</FormLabel>
                <FormControl>
                  <Input placeholder={t.form.destinationPlaceholder} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="cargoType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.form.cargoType}</FormLabel>
              <FormControl>
                <Input placeholder={t.form.cargoTypePlaceholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid sm:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="pieceCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.form.pieceCount}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={1_000_000}
                    step={1}
                    value={field.value ?? ""}
                    onChange={(event) => field.onChange(event.target.value === "" ? undefined : event.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cartonCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.form.cartonCount}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={1_000_000}
                    step={1}
                    value={field.value ?? ""}
                    onChange={(event) => field.onChange(event.target.value === "" ? undefined : event.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="palletCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.form.palletCount}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={1_000_000}
                    step={1}
                    value={field.value ?? ""}
                    onChange={(event) => field.onChange(event.target.value === "" ? undefined : event.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="weightValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.form.weightValue}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0.001"
                    step="0.001"
                    placeholder={t.form.weightValuePlaceholder}
                    value={field.value ?? ""}
                    onChange={(event) => field.onChange(event.target.value || undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="weightUnit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.form.weightUnit}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t.form.selectUnit} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="KG">KG</SelectItem>
                    <SelectItem value="LB">LB</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid sm:grid-cols-4 gap-4">
          {(["length", "width", "height"] as const).map((name) => (
            <FormField
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.form[name]}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={field.value ?? ""}
                      onChange={(event) => field.onChange(event.target.value || undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <FormField
            control={form.control}
            name="dimensionUnit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.form.dimensionUnit}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t.form.selectUnit} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="CM">CM</SelectItem>
                    <SelectItem value="IN">IN</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="requestedDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.form.requestedDate}</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={field.value ?? ""}
                  onChange={(event) => field.onChange(event.target.value || undefined)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.form.detailsRequired} {t.form.required}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t.form.detailsPlaceholder}
                  rows={5}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="py-2">
          {recaptchaSiteKey ? (
            <CaptchaV2Checkbox
              siteKey={recaptchaSiteKey}
              onVerify={(token) => {
                setCaptchaToken(token);
                form.setValue("captchaToken", token, { shouldValidate: true });
              }}
              onExpire={handleCaptchaExpire}
              onError={() => {
                handleCaptchaExpire();
                setSubmitError(t.auth.captchaFailed);
              }}
              resetKey={captchaResetKey}
            />
          ) : (
            <CaptchaUnavailable message={t.auth.captchaUnavailable} />
          )}
        </div>

        {submitError && (
          <p role="alert" aria-live="polite" className="text-sm text-destructive">
            {submitError}
          </p>
        )}
        <p className="sr-only" aria-live="polite">
          {isSubmitting ? t.form.submitting : ""}
        </p>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isSubmitting || !recaptchaSiteKey || !captchaToken}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t.form.submitting}
            </>
          ) : (
            t.form.submit
          )}
        </Button>
      </form>
    </Form>
  );
}
