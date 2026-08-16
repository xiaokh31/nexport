"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { WorkspacePageHeader, WorkspacePanel } from "@/components/workspace/workspace-ui";
import { useLocale } from "@/i18n/locale-context";

const passwordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
  confirmPassword: z.string().min(6),
}).refine((data) => data.newPassword === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "两次输入的密码不一致",
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function PasswordPage() {
  const { t } = useLocale();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(data: PasswordFormValues) {
    setLoading(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "密码更新失败");
      form.reset();
      setSaved(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    ["currentPassword", t.user.currentPassword, t.user.currentPasswordPlaceholder, "current-password"],
    ["newPassword", t.user.newPassword, t.user.newPasswordPlaceholder, "new-password"],
    ["confirmPassword", t.user.confirmNewPassword, t.user.confirmNewPasswordPlaceholder, "new-password"],
  ] as const;

  return (
    <div className="space-y-6">
      <WorkspacePageHeader eyebrow={t.user.center} title={t.user.passwordTitle} description={t.user.passwordDescription} />
      <WorkspacePanel title={t.user.passwordSecurity} description={t.user.passwordHint} icon={ShieldCheck}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-xl space-y-5">
            {error ? <div role="alert" aria-live="assertive" className="border-l-4 border-destructive bg-destructive/5 p-3 text-sm text-destructive">{error}</div> : null}
            {fields.map(([name, label, placeholder, autoComplete]) => (
              <FormField key={name} control={form.control} name={name} render={({ field }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl><Input type="password" autoComplete={autoComplete} aria-required="true" placeholder={placeholder} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            ))}
            <div className="border-l-4 border-signal-amber bg-concrete/45 px-4 py-3">
              <p className="text-sm font-semibold">{t.user.passwordRequirements}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>{t.user.passwordReq1}</li>
                <li>{t.user.passwordReq2}</li>
                <li>{t.user.passwordReq3}</li>
                <li>{t.user.passwordReq4}</li>
              </ul>
            </div>
            <div className="flex flex-wrap items-center gap-4 border-t border-border pt-5">
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" /> : <Save aria-hidden="true" className="mr-2 h-4 w-4" />}
                {loading ? t.user.changing : t.user.changePassword}
              </Button>
              <span role="status" aria-live="polite" className="text-sm text-success">{saved ? t.user.passwordChanged : ""}</span>
            </div>
          </form>
        </Form>
      </WorkspacePanel>
    </div>
  );
}
