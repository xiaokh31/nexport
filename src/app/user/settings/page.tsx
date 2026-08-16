"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Globe, History, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkspaceEmpty, WorkspaceLoading, WorkspacePageHeader, WorkspacePanel } from "@/components/workspace/workspace-ui";
import { useLocale } from "@/i18n/locale-context";
import { type Locale, locales } from "@/i18n";

interface LoginHistoryItem {
  id: string;
  ip: string | null;
  device: string | null;
  location: string | null;
  status: string;
  createdAt: string;
}

export default function SettingsPage() {
  const { t, locale, setLocale } = useLocale();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [quoteEmailUpdates, setQuoteEmailUpdates] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [userLocale, setUserLocale] = useState<Locale>(locale);

  useEffect(() => {
    let active = true;
    async function fetchSettings() {
      try {
        const response = await fetch("/api/user/settings", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "读取设置失败");
        if (!active) return;
        setEmailNotifications(data.settings.emailNotifications);
        setQuoteEmailUpdates(data.settings.quoteEmailUpdates);
        if (data.settings.locale && locales.includes(data.settings.locale)) {
          setUserLocale(data.settings.locale);
          setLocale(data.settings.locale);
        }
      } catch (requestError) {
        if (active) setError(requestError instanceof Error ? requestError.message : "读取设置失败");
      } finally {
        if (active) setLoading(false);
      }
    }
    void fetchSettings();
    return () => { active = false; };
  }, [setLocale]);

  async function saveSetting(payload: Record<string, boolean | Locale>) {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "保存设置失败");
      setSaved(true);
      return true;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "保存设置失败");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function updateBooleanSetting(setting: "emailNotifications" | "quoteEmailUpdates", value: boolean) {
    if (setting === "emailNotifications") setEmailNotifications(value);
    else setQuoteEmailUpdates(value);
    const ok = await saveSetting({ [setting]: value });
    if (!ok) {
      if (setting === "emailNotifications") setEmailNotifications(!value);
      else setQuoteEmailUpdates(!value);
    }
  }

  async function saveLanguagePreference(nextLocale: Locale) {
    const previousLocale = userLocale;
    setUserLocale(nextLocale);
    const ok = await saveSetting({ locale: nextLocale });
    if (ok) setLocale(nextLocale);
    else setUserLocale(previousLocale);
  }

  async function openHistoryDialog() {
    setHistoryOpen(true);
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const response = await fetch("/api/user/login-history?limit=20", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "读取登录历史失败");
      setLoginHistory(data.history || []);
    } catch (requestError) {
      setHistoryError(requestError instanceof Error ? requestError.message : "读取登录历史失败");
    } finally {
      setLoadingHistory(false);
    }
  }

  if (loading) return <WorkspaceLoading label={t.common.loading} />;

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow={t.user.center}
        title={t.user.settingsTitle}
        description={t.user.settingsDescription}
        actions={saved ? <span role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-success"><Check aria-hidden="true" className="h-4 w-4" />{t.user.saved}</span> : undefined}
      />
      {error ? <div role="alert" aria-live="assertive" className="border-l-4 border-destructive bg-destructive/5 p-3 text-sm text-destructive">{error}</div> : null}

      <WorkspacePanel title={t.user.notificationSettings} description={t.user.notificationHint} icon={Bell}>
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label htmlFor="email-notifications">{t.user.emailNotifications}</Label>
              <p id="email-notifications-hint" className="mt-1 text-sm text-muted-foreground">{t.user.emailNotificationsHint}</p>
            </div>
            <Switch id="email-notifications" aria-describedby="email-notifications-hint" checked={emailNotifications} disabled={saving} onCheckedChange={(value) => void updateBooleanSetting("emailNotifications", value)} />
          </div>
          <Separator />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label htmlFor="quote-email-updates">{t.user.quoteEmailUpdates}</Label>
              <p id="quote-email-updates-hint" className="mt-1 text-sm text-muted-foreground">{t.user.quoteEmailUpdatesHint}</p>
            </div>
            <Switch id="quote-email-updates" aria-describedby="quote-email-updates-hint" checked={quoteEmailUpdates} disabled={saving} onCheckedChange={(value) => void updateBooleanSetting("quoteEmailUpdates", value)} />
          </div>
        </div>
      </WorkspacePanel>

      <WorkspacePanel title={t.user.languageSettings} description={t.user.languageHint} icon={Globe}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Label htmlFor="language-select">{t.user.preferredLanguage}</Label>
          <Select value={userLocale} onValueChange={(value) => void saveLanguagePreference(value as Locale)} disabled={saving}>
            <SelectTrigger id="language-select" className="w-full sm:w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="zh">{t.user.chinese}</SelectItem>
              <SelectItem value="en">{t.user.english}</SelectItem>
              <SelectItem value="fr">{t.user.french}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </WorkspacePanel>

      <WorkspacePanel title={t.user.securitySettings} description={t.user.securityHint} icon={Shield}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 font-semibold"><History aria-hidden="true" className="h-4 w-4" />{t.user.loginHistory}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t.user.loginHistoryHint}</p>
          </div>
          <Button variant="outline" onClick={() => void openHistoryDialog()}>{t.user.view}</Button>
        </div>
      </WorkspacePanel>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-h-[85svh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.user.loginHistoryTitle}</DialogTitle>
            <DialogDescription>{t.user.loginHistoryDescription}</DialogDescription>
          </DialogHeader>
          {loadingHistory ? (
            <div role="status" aria-live="polite" aria-busy="true" className="flex items-center justify-center gap-3 py-10 text-sm text-muted-foreground"><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />{t.common.loading}</div>
          ) : historyError ? (
            <div role="alert" className="border-l-4 border-destructive bg-destructive/5 p-3 text-sm text-destructive">{historyError}</div>
          ) : loginHistory.length ? (
            <ul className="divide-y divide-border border-y border-border">
              {loginHistory.map((item) => (
                <li key={item.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{item.device || t.user.unknownDevice}</p>
                    <p className="text-sm text-muted-foreground">{item.ip || t.user.unknownIP} · {item.location || t.user.unknownLocation}</p>
                  </div>
                  <div className="sm:text-right">
                    <p className={item.status === "SUCCESS" ? "text-sm text-success" : "text-sm text-destructive"}>{item.status === "SUCCESS" ? t.user.success : t.user.failed}</p>
                    <time className="text-xs text-muted-foreground" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <WorkspaceEmpty title={t.user.noLoginHistory} description="新的登录活动会在成功或失败后记录在这里。" icon={History} />
          )}
          <DialogFooter><Button variant="outline" onClick={() => setHistoryOpen(false)}>{t.user.close}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
