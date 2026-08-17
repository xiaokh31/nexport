"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie, Settings } from "lucide-react";
import { useLocale } from "@/i18n/locale-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Cookie 同意状态类型
interface CookiePreferences {
  necessary: boolean; // 必要Cookie（始终开启）
  analytics: boolean; // 分析Cookie
  marketing: boolean; // 营销Cookie
  preferences: boolean; // 偏好Cookie
}

const COOKIE_CONSENT_KEY = "site_cookie_consent";
const COOKIE_PREFERENCES_KEY = "site_cookie_preferences";

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false,
  });
  const { t } = useLocale();

  useEffect(() => {
    // 检查是否已经同意Cookie
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    const savedPreferences = consent
      ? localStorage.getItem(COOKIE_PREFERENCES_KEY)
      : null;
    // 延迟显示，避免影响首屏加载；已保存的偏好在挂载后恢复。
    const timer = window.setTimeout(() => {
      if (!consent) {
        setIsVisible(true);
        return;
      }
      if (savedPreferences) {
        try {
          setPreferences(JSON.parse(savedPreferences) as CookiePreferences);
        } catch (error) {
          console.warn("Unable to restore cookie preferences.", error);
        }
      }
    }, consent ? 0 : 1500);

    return () => window.clearTimeout(timer);
  }, []);

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    };
    saveConsent(allAccepted);
  };

  const handleRejectAll = () => {
    const onlyNecessary: CookiePreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
    };
    saveConsent(onlyNecessary);
  };

  const handleSavePreferences = () => {
    saveConsent(preferences);
    setShowSettings(false);
  };

  const saveConsent = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "true");
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs));
    setPreferences(prefs);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Cookie 提示横幅 - 固定在底部 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t shadow-lg animate-in slide-in-from-bottom duration-500">
        <div className="container max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            {/* Cookie 图标和文本 */}
            <div className="flex items-start gap-3 flex-1">
              <Cookie className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground">
                  {t.cookie?.title || "Cookie Settings"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t.cookie?.description || 
                    "We use cookies to enhance your browsing experience, analyze site traffic, and personalize content. By clicking 'Accept All', you consent to our use of cookies."}
                </p>
              </div>
            </div>

            {/* 按钮组 */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRejectAll}
                className="flex-1 md:flex-none"
              >
                {t.cookie?.rejectAll || "Reject All"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="flex-1 md:flex-none"
              >
                <Settings className="h-4 w-4 mr-1" />
                {t.cookie?.customize || "Customize"}
              </Button>
              <Button
                size="sm"
                onClick={handleAcceptAll}
                className="flex-1 md:flex-none"
              >
                {t.cookie?.acceptAll || "Accept All"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 自定义设置对话框 */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5" />
              {t.cookie?.settingsTitle || "Cookie Preferences"}
            </DialogTitle>
            <DialogDescription>
              {t.cookie?.settingsDescription || 
                "Manage your cookie preferences. You can enable or disable different types of cookies below."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 必要Cookie */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">
                  {t.cookie?.necessary || "Necessary Cookies"}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t.cookie?.necessaryDesc || "Essential for the website to function properly."}
                </p>
              </div>
              <Switch checked={true} disabled />
            </div>

            {/* 分析Cookie */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">
                  {t.cookie?.analytics || "Analytics Cookies"}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t.cookie?.analyticsDesc || "Help us understand how visitors interact with our website."}
                </p>
              </div>
              <Switch
                checked={preferences.analytics}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, analytics: checked })
                }
              />
            </div>

            {/* 营销Cookie */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">
                  {t.cookie?.marketing || "Marketing Cookies"}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t.cookie?.marketingDesc || "Used to track visitors across websites for advertising purposes."}
                </p>
              </div>
              <Switch
                checked={preferences.marketing}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, marketing: checked })
                }
              />
            </div>

            {/* 偏好Cookie */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">
                  {t.cookie?.preferences || "Preference Cookies"}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t.cookie?.preferencesDesc || "Remember your settings and preferences for a better experience."}
                </p>
              </div>
              <Switch
                checked={preferences.preferences}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, preferences: checked })
                }
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSettings(false)}
              className="flex-1"
            >
              {t.cookie?.cancel || "Cancel"}
            </Button>
            <Button onClick={handleSavePreferences} className="flex-1">
              {t.cookie?.savePreferences || "Save Preferences"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
