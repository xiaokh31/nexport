"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Globe, Mail, Shield, Loader2 } from "lucide-react";
import { useLocale } from "@/i18n/locale-context";

interface Settings {
  siteName: string;
  siteUrl: string;
  siteDescription: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  sessionTimeout: string;
  maxLoginAttempts: string;
}

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>({
    siteName: '',
    siteUrl: '',
    siteDescription: '',
    contactEmail: '',
    contactPhone: '',
    contactAddress: '',
    sessionTimeout: '',
    maxLoginAttempts: '',
  });
  const { t } = useLocale();

  // 获取设置
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/admin/settings');
        if (response.ok) {
          const data = await response.json();
          setSettings(data.settings);
        } else {
          const errData = await response.json();
          setError(errData.error || '获取设置失败');
        }
      } catch (err) {
        setError('获取设置失败');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleInputChange = (key: keyof Settings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    // 清除之前的消息
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });

      if (response.ok) {
        setSuccess('设置已保存');
      } else {
        const errData = await response.json();
        setError(errData.error || '保存设置失败');
      }
    } catch (err) {
      setError('保存设置失败');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.admin?.settings || '系统设置'}</h1>
        <p className="text-muted-foreground">配置网站的基本信息和系统参数</p>
      </div>

      {/* 消息提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Site Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            网站设置
          </CardTitle>
          <CardDescription>配置网站的基本信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">网站名称</Label>
              <Input 
                id="siteName" 
                value={settings.siteName}
                onChange={(e) => handleInputChange('siteName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteUrl">网站地址</Label>
              <Input 
                id="siteUrl" 
                value={settings.siteUrl}
                onChange={(e) => handleInputChange('siteUrl', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="siteDescription">网站描述</Label>
            <Input 
              id="siteDescription" 
              value={settings.siteDescription}
              onChange={(e) => handleInputChange('siteDescription', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            联系信息
          </CardTitle>
          <CardDescription>配置公司的联系方式</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">联系邮箱</Label>
              <Input 
                id="email" 
                value={settings.contactEmail}
                onChange={(e) => handleInputChange('contactEmail', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">联系电话</Label>
              <Input 
                id="phone" 
                value={settings.contactPhone}
                onChange={(e) => handleInputChange('contactPhone', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">公司地址</Label>
            <Input 
              id="address" 
              value={settings.contactAddress}
              onChange={(e) => handleInputChange('contactAddress', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            安全设置
          </CardTitle>
          <CardDescription>配置系统的安全参数</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">会话超时（分钟）</Label>
              <Input 
                id="sessionTimeout" 
                type="number" 
                value={settings.sessionTimeout}
                onChange={(e) => handleInputChange('sessionTimeout', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxLoginAttempts">最大登录尝试次数</Label>
              <Input 
                id="maxLoginAttempts" 
                type="number" 
                value={settings.maxLoginAttempts}
                onChange={(e) => handleInputChange('maxLoginAttempts', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              保存设置
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
