"use client";

import { useEffect, useState } from "react";
import { Globe, Loader2, Mail, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WorkspaceLoading, WorkspacePageHeader, WorkspacePanel } from "@/components/workspace/workspace-ui";

interface Settings {
  siteName: string;
  siteUrl: string;
  siteDescription: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
}

const emptySettings: Settings = {
  siteName: "",
  siteUrl: "",
  siteDescription: "",
  contactEmail: "",
  contactPhone: "",
  contactAddress: "",
};

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(emptySettings);

  useEffect(() => {
    let active = true;
    async function fetchSettings() {
      try {
        const response = await fetch("/api/admin/settings", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "获取设置失败");
        if (active) setSettings({ ...emptySettings, ...data.settings });
      } catch (requestError) {
        if (active) setError(requestError instanceof Error ? requestError.message : "获取设置失败");
      } finally {
        if (active) setLoading(false);
      }
    }
    void fetchSettings();
    return () => { active = false; };
  }, []);

  function update(key: keyof Settings, value: string) {
    setSettings((current) => ({ ...current, [key]: value }));
    setError(null);
    setSuccess(null);
  }

  async function saveSettings() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "保存设置失败");
      setSuccess("设置已保存");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "保存设置失败");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <WorkspaceLoading label="正在读取系统设置…" />;

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow="后台工作台"
        title="系统设置"
        description="维护会真实显示在站点上的名称、地址与联系方式；未接入运行时的安全参数不在此展示。"
        actions={<Button disabled={saving} onClick={() => void saveSettings()}>{saving ? <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" /> : <Save aria-hidden="true" className="mr-2 h-4 w-4" />}{saving ? "保存中…" : "保存设置"}</Button>}
      />
      {error ? <div role="alert" aria-live="assertive" className="border-l-4 border-destructive bg-destructive/5 p-3 text-sm text-destructive">{error}</div> : null}
      {success ? <div role="status" aria-live="polite" className="border-l-4 border-success bg-success/5 p-3 text-sm text-success">{success}</div> : null}

      <WorkspacePanel title="网站信息" description="这些字段应填写已确认、可公开的站点资料。" icon={Globe}>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="siteName">网站名称</Label><Input id="siteName" maxLength={200} value={settings.siteName} onChange={(event) => update("siteName", event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="siteUrl">网站地址</Label><Input id="siteUrl" type="url" maxLength={500} value={settings.siteUrl} onChange={(event) => update("siteUrl", event.target.value)} /></div>
          <div className="space-y-2 md:col-span-2"><Label htmlFor="siteDescription">网站描述</Label><Input id="siteDescription" maxLength={500} value={settings.siteDescription} onChange={(event) => update("siteDescription", event.target.value)} /></div>
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="联系信息" description="仅保存已确认可供客户使用的联系渠道。" icon={Mail}>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="contactEmail">联系邮箱</Label><Input id="contactEmail" type="email" maxLength={254} value={settings.contactEmail} onChange={(event) => update("contactEmail", event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="contactPhone">联系电话</Label><Input id="contactPhone" type="tel" maxLength={32} value={settings.contactPhone} onChange={(event) => update("contactPhone", event.target.value)} /></div>
          <div className="space-y-2 md:col-span-2"><Label htmlFor="contactAddress">联系地址</Label><Input id="contactAddress" maxLength={500} value={settings.contactAddress} onChange={(event) => update("contactAddress", event.target.value)} /></div>
        </div>
      </WorkspacePanel>
    </div>
  );
}
