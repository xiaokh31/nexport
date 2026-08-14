"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { solutionConfigs } from "@/config/site-config";

export function QuoteForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { t } = useLocale();

  // 使用 solutionConfigs 生成服务类型选项，支持 i18n
  const serviceOptions = solutionConfigs.map(({ key }) => ({
    value: key.toUpperCase(),
    label: (t.solutions?.[key] as { title: string } | undefined)?.title || key,
  }));

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      serviceType: undefined,
      origin: "",
      destination: "",
      cargoType: "",
      weight: "",
      dimensions: "",
      message: "",
    },
  });

  async function onSubmit(data: QuoteFormValues) {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setIsSuccess(true);
        form.reset();
      } else {
        throw new Error(t.form.submitFailed);
      }
    } catch (error) {
      console.error("Error submitting quote:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-2xl font-semibold mb-2">{t.form.submitSuccess}</h3>
        <p className="text-muted-foreground mb-6">
          {t.form.thankYou}
        </p>
        <Button onClick={() => setIsSuccess(false)}>{t.form.continueQuote}</Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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

        <div className="grid sm:grid-cols-3 gap-4">
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

          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.form.weight}</FormLabel>
                <FormControl>
                  <Input placeholder={t.form.weightPlaceholder} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dimensions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.form.dimensions}</FormLabel>
                <FormControl>
                  <Input placeholder={t.form.dimensionsPlaceholder} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
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
