"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  useForm,
  type FieldErrors,
  type FieldPath,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, Loader2 } from "lucide-react";
import { CaptchaUnavailable, CaptchaV2Checkbox } from "@/components/captcha";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { publicEnv } from "@/config/env/public";
import { getPublicPageCopy } from "@/config/public-page-content";
import { isServiceType } from "@/config/quote";
import { getServiceTypeOptions } from "@/config/site-config";
import { useLocale } from "@/i18n/locale-context";
import { quoteFormSchema, type QuoteFormValues } from "@/lib/validations";

function RequiredLabel({ children, word }: { children: ReactNode; word: string }) {
  return (
    <>
      {children}
      <span className="ml-1 text-destructive" aria-hidden="true">*</span>
      <span className="sr-only"> ({word})</span>
    </>
  );
}

function FormSection({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0 border-t border-border pt-7">
      <legend className="pr-4 font-utility text-xs font-semibold uppercase tracking-[0.14em] text-steel-blue">
        {legend}
      </legend>
      <div className="mt-6 space-y-5">{children}</div>
    </fieldset>
  );
}

export function QuoteForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successReference, setSuccessReference] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const { locale, t } = useLocale();
  const { data: session } = useSession();
  const copy = getPublicPageCopy(locale).quoteForm;
  const serviceOptions = getServiceTypeOptions(t);
  const recaptchaSiteKey = publicEnv.recaptchaSiteKey;
  const earliestRequestedDate = new Date().toISOString().slice(0, 10);

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
        const fields = fieldErrors
          ? Object.entries(fieldErrors).filter(
              (entry): entry is [keyof QuoteFormValues, string[]] =>
                Array.isArray(entry[1]) && entry[1].length > 0,
            )
          : [];

        for (const [field, messages] of fields) {
          form.setError(field, { type: "server", message: messages[0] });
        }
        setSubmitError(copy.submitFailure);
        if (fields[0]) form.setFocus(fields[0][0]);
      }
    } catch {
      setSubmitError(copy.submitFailure);
    } finally {
      setIsSubmitting(false);
      setCaptchaToken("");
      form.setValue("captchaToken", undefined);
      setCaptchaResetKey((value) => value + 1);
    }
  }

  function onInvalid(errors: FieldErrors<QuoteFormValues>) {
    setSubmitError(null);
    const firstField = Object.keys(errors)[0] as FieldPath<QuoteFormValues> | undefined;
    if (firstField) form.setFocus(firstField);
  }

  function handleCaptchaExpire() {
    setCaptchaToken("");
    form.setValue("captchaToken", undefined);
  }

  if (successReference) {
    return (
      <div role="status" aria-live="polite" className="mt-8 border-t-2 border-success bg-paper-white p-6 text-center sm:p-10">
        <CheckCircle className="mx-auto size-12 status-success" aria-hidden="true" />
        <h3 className="mt-5 font-display text-3xl font-bold">{copy.successTitle}</h3>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">{copy.successDescription}</p>
        <p className="mt-6 text-sm text-muted-foreground">{t.form.reference}</p>
        <code className="mt-2 inline-block max-w-full break-all border border-dock-navy bg-concrete px-4 py-2 font-utility font-semibold text-foreground">
          {successReference}
        </code>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={() => setSuccessReference(null)}>{copy.submitAnother}</Button>
          {session?.user && (
            <Button asChild variant="outline">
              <Link href="/user/quotes">{t.user.myQuotes}</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  const hasValidationErrors =
    form.formState.isSubmitted && Object.keys(form.formState.errors).length > 0;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
        className="mt-8 space-y-9"
        noValidate
      >
        <input type="hidden" {...form.register("submissionKey")} />

        {hasValidationErrors && (
          <p role="alert" aria-live="assertive" className="border-l-4 border-destructive bg-paper-white p-4 text-sm text-destructive">
            {copy.validationSummary}
          </p>
        )}

        <FormSection legend={copy.sections.contact}>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel><RequiredLabel word={copy.required}>{t.contact.form.name}</RequiredLabel></FormLabel>
                  <FormControl>
                    <Input autoComplete="name" maxLength={100} aria-required="true" placeholder={t.user.namePlaceholder} {...field} />
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
                  <FormLabel><RequiredLabel word={copy.required}>{t.contact.form.email}</RequiredLabel></FormLabel>
                  <FormControl>
                    <Input type="email" inputMode="email" autoComplete="email" maxLength={254} aria-required="true" placeholder={t.user.emailPlaceholder} {...field} />
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
                  <FormLabel><RequiredLabel word={copy.required}>{t.contact.form.phone}</RequiredLabel></FormLabel>
                  <FormControl>
                    <Input type="tel" inputMode="tel" autoComplete="tel" maxLength={32} aria-required="true" placeholder={t.user.phonePlaceholder} {...field} />
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
                    <Input autoComplete="organization" maxLength={160} placeholder={t.user.companyPlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        <FormSection legend={copy.sections.service}>
          <FormField
            control={form.control}
            name="serviceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel><RequiredLabel word={copy.required}>{t.contact.form.service}</RequiredLabel></FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger aria-required="true">
                      <SelectValue placeholder={t.form.selectServiceType} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {serviceOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="origin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.form.origin} {t.form.optional}</FormLabel>
                  <FormControl><Input maxLength={160} placeholder={t.form.originPlaceholder} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.form.destination} {t.form.optional}</FormLabel>
                  <FormControl><Input maxLength={160} placeholder={t.form.destinationPlaceholder} {...field} /></FormControl>
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
                <FormLabel>{t.form.requestedDate} {t.form.optional}</FormLabel>
                <FormControl>
                  <Input type="date" min={earliestRequestedDate} value={field.value ?? ""} onChange={(event) => field.onChange(event.target.value || undefined)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        <FormSection legend={copy.sections.cargo}>
          <FormField
            control={form.control}
            name="cargoType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.form.cargoType} {t.form.optional}</FormLabel>
                <FormControl><Input maxLength={120} placeholder={t.form.cargoTypePlaceholder} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-5 sm:grid-cols-3">
            {(["pieceCount", "cartonCount", "palletCount"] as const).map((name) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.form[name]} {t.form.optional}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
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
            ))}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="weightValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.form.weightValue} {t.form.optional}</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="decimal" min="0.001" step="0.001" placeholder={t.form.weightValuePlaceholder} value={field.value ?? ""} onChange={(event) => field.onChange(event.target.value || undefined)} />
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
                  <FormLabel>{t.form.weightUnit} {t.form.optional}</FormLabel>
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
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {(["length", "width", "height"] as const).map((name) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.form[name]} {t.form.optional}</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="decimal" min="0.001" step="0.001" value={field.value ?? ""} onChange={(event) => field.onChange(event.target.value || undefined)} />
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
                  <FormLabel>{t.form.dimensionUnit} {t.form.optional}</FormLabel>
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
        </FormSection>

        <FormSection legend={copy.sections.details}>
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel><RequiredLabel word={copy.required}>{t.form.detailsRequired}</RequiredLabel></FormLabel>
                <FormControl>
                  <Textarea maxLength={4_000} aria-required="true" placeholder={t.form.detailsPlaceholder} rows={6} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <p className="text-sm leading-7 text-muted-foreground">
            {copy.privacyPrefix}{" "}
            <Link href="/privacy" className="font-semibold text-foreground underline underline-offset-4">
              {copy.privacyLink}
            </Link>
            {copy.privacySuffix}
          </p>

          <div className="max-w-full overflow-x-auto py-2" data-quote-captcha>
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
              <CaptchaUnavailable message={copy.captchaUnavailable} />
            )}
          </div>

          {submitError && (
            <p role="alert" aria-live="assertive" className="border-l-4 border-destructive bg-paper-white p-4 text-sm leading-6 text-destructive">
              {submitError}
            </p>
          )}
          <p className="sr-only" role="status" aria-live="polite">
            {isSubmitting ? copy.submitting : ""}
          </p>

          <Button
            type="submit"
            size="lg"
            className="w-full sm:w-auto"
            disabled={isSubmitting || !recaptchaSiteKey || !captchaToken}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {copy.submitting}
              </>
            ) : copy.submit}
          </Button>
        </FormSection>
      </form>
    </Form>
  );
}
