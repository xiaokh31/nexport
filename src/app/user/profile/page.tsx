"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Contact, Loader2, Save } from "lucide-react";
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
import {
  WorkspaceError,
  WorkspaceLoading,
  WorkspacePageHeader,
  WorkspacePanel,
} from "@/components/workspace/workspace-ui";
import { useLocale } from "@/i18n/locale-context";

const profileSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.email(),
  phone: z.string().max(32).optional(),
  company: z.string().max(200).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  role: string;
}

export default function ProfilePage() {
  const { t } = useLocale();
  const { data: session, update: updateSession } = useSession();
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [saved, setSaved] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", email: "", phone: "", company: "" },
  });

  useEffect(() => {
    let active = true;
    async function fetchUser() {
      try {
        const response = await fetch("/api/user/profile", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "获取用户数据失败");
        if (!active) return;
        setUser(data.user);
        form.reset({
          name: data.user.name || "",
          email: data.user.email || "",
          phone: data.user.phone || "",
          company: data.user.company || "",
        });
      } catch (requestError) {
        if (active) setError(requestError instanceof Error ? requestError.message : "获取用户数据失败");
      } finally {
        if (active) setFetching(false);
      }
    }
    void fetchUser();
    return () => { active = false; };
  }, [form]);

  async function onSubmit(data: ProfileFormValues) {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, phone: data.phone, company: data.company }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "更新失败");
      setUser(result.user);
      setSaved(true);
      if (result.user.name !== session?.user?.name) await updateSession({ name: result.user.name });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "更新失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  if (fetching) return <WorkspaceLoading label={t.common.loading} />;
  if (!user) {
    return <WorkspaceError title={t.user.profileTitle} description={error || "获取用户数据失败"} />;
  }

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow={t.user.center}
        title={t.user.profileTitle}
        description={t.user.profileDescription}
      />
      <WorkspacePanel title={t.user.basicInfo} description={t.user.updateProfile} icon={Contact}>
        {error ? (
          <div role="alert" aria-live="assertive" className="mb-5 border-l-4 border-destructive bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.user.name}</FormLabel>
                  <FormControl><Input autoComplete="name" maxLength={100} aria-required="true" placeholder={t.user.namePlaceholder} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.user.emailLabel}</FormLabel>
                  <FormControl><Input type="email" autoComplete="email" placeholder={t.user.emailPlaceholder} {...field} disabled /></FormControl>
                  <p className="text-xs text-muted-foreground">登录邮箱不可在此页面修改。</p>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.user.phone}</FormLabel>
                  <FormControl><Input type="tel" autoComplete="tel" maxLength={32} placeholder={t.user.phonePlaceholder} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="company" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.user.company}</FormLabel>
                  <FormControl><Input autoComplete="organization" maxLength={200} placeholder={t.user.companyPlaceholder} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="flex flex-wrap items-center gap-4 border-t border-border pt-5">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" /> : <Save aria-hidden="true" className="mr-2 h-4 w-4" />}
                {saving ? t.user.saving : t.user.saveChanges}
              </Button>
              <span role="status" aria-live="polite" className="text-sm text-success">
                {saved ? t.user.saveSuccess : ""}
              </span>
            </div>
          </form>
        </Form>
      </WorkspacePanel>
    </div>
  );
}
