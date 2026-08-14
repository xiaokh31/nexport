"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Bell, Shield, Trash2, Loader2, Check, History, Globe } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale } from "@/i18n/locale-context";
import { Locale, locales, localeNames } from "@/i18n";

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
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [quoteUpdates, setQuoteUpdates] = useState(true);
  const [newsUpdates, setNewsUpdates] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [userLocale, setUserLocale] = useState<Locale>(locale);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/user/settings");
        if (response.ok) {
          const data = await response.json();
          setEmailNotifications(data.settings.emailNotifications);
          setQuoteUpdates(data.settings.quoteUpdates);
          setNewsUpdates(data.settings.newsUpdates);
          // 读取用户语言偏好并同步到界面
          if (data.settings.locale && locales.includes(data.settings.locale)) {
            setUserLocale(data.settings.locale);
            setLocale(data.settings.locale);
          }
        }
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [session, setLocale]);

  const saveNotificationSettings = async (setting: string, value: boolean) => {
    setSaving(true);
    try {
      const payload: Record<string, boolean> = {};
      payload[setting] = value;
      
      const response = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        if (setting === "emailNotifications") setEmailNotifications(!value);
        if (setting === "quoteUpdates") setQuoteUpdates(!value);
        if (setting === "newsUpdates") setNewsUpdates(!value);
        alert("Save failed");
      }
    } catch (err) {
      console.error("Settings error:", err);
      if (setting === "emailNotifications") setEmailNotifications(!value);
      if (setting === "quoteUpdates") setQuoteUpdates(!value);
      if (setting === "newsUpdates") setNewsUpdates(!value);
      alert("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const fetchLoginHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch("/api/user/login-history");
      if (response.ok) {
        const data = await response.json();
        setLoginHistory(data.history || []);
      }
    } catch (err) {
      console.error("Failed to fetch login history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const openHistoryDialog = () => {
    setShowHistoryDialog(true);
    fetchLoginHistory();
  };

  // 保存语言偏好
  const saveLanguagePreference = async (newLocale: Locale) => {
    setSaving(true);
    try {
      const response = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: newLocale }),
      });

      if (response.ok) {
        setUserLocale(newLocale);
        setLocale(newLocale);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        alert("Save failed");
      }
    } catch (err) {
      console.error("Language save error:", err);
      alert("Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t.user.settingsTitle}</h1>
          <p className="text-muted-foreground">{t.user.settingsDescription}</p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 text-green-600">
            <Check className="h-4 w-4" />
            <span className="text-sm">{t.user.saved}</span>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t.user.notificationSettings}
          </CardTitle>
          <CardDescription>{t.user.notificationHint}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">{t.user.emailNotifications}</Label>
              <p className="text-sm text-muted-foreground">
                {t.user.emailNotificationsHint}
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={emailNotifications}
              disabled={saving}
              onCheckedChange={(value) => {
                setEmailNotifications(value);
                saveNotificationSettings("emailNotifications", value);
              }}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="quote-updates">{t.user.quoteUpdates}</Label>
              <p className="text-sm text-muted-foreground">
                {t.user.quoteUpdatesHint}
              </p>
            </div>
            <Switch
              id="quote-updates"
              checked={quoteUpdates}
              disabled={saving}
              onCheckedChange={(value) => {
                setQuoteUpdates(value);
                saveNotificationSettings("quoteUpdates", value);
              }}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="news-updates">{t.user.newsUpdates}</Label>
              <p className="text-sm text-muted-foreground">
                {t.user.newsUpdatesHint}
              </p>
            </div>
            <Switch
              id="news-updates"
              checked={newsUpdates}
              disabled={saving}
              onCheckedChange={(value) => {
                setNewsUpdates(value);
                saveNotificationSettings("newsUpdates", value);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* 语言设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t.user.languageSettings}
          </CardTitle>
          <CardDescription>{t.user.languageHint}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="language-select">{t.user.preferredLanguage}</Label>
              <p className="text-sm text-muted-foreground">
                {t.user.languageHint}
              </p>
            </div>
            <Select
              value={userLocale}
              onValueChange={(value) => saveLanguagePreference(value as Locale)}
              disabled={saving}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh">{t.user.chinese}</SelectItem>
                <SelectItem value="en">{t.user.english}</SelectItem>
                <SelectItem value="fr">{t.user.french}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t.user.securitySettings}
          </CardTitle>
          <CardDescription>{t.user.securityHint}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <History className="h-4 w-4" />
                {t.user.loginHistory}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t.user.loginHistoryHint}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={openHistoryDialog}>
              {t.user.view}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.user.loginHistoryTitle}</DialogTitle>
            <DialogDescription>{t.user.loginHistoryDescription}</DialogDescription>
          </DialogHeader>
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : loginHistory.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-auto">
              {loginHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{item.device || t.user.unknownDevice}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.ip || t.user.unknownIP} · {item.location || t.user.unknownLocation}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-sm ${
                        item.status === "SUCCESS" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {item.status === "SUCCESS" ? t.user.success : t.user.failed}
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t.user.noLoginHistory}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>
              {t.user.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            {t.user.dangerZone}
          </CardTitle>
          <CardDescription>{t.user.dangerHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t.user.deleteAccount}</Label>
              <p className="text-sm text-muted-foreground">
                {t.user.deleteAccountHint}
              </p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  {t.user.deleteAccount}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t.user.deleteConfirmTitle}</DialogTitle>
                  <DialogDescription>
                    {t.user.deleteConfirmMessage}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline">{t.user.cancel}</Button>
                  <Button variant="destructive">{t.user.confirmDelete}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
