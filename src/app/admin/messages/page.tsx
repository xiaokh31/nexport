"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Bell, Send, Plus, Loader2, Users } from "lucide-react";
import { useLocale } from "@/i18n/locale-context";

interface User {
  id: string;
  name: string | null;
  email: string;
}

export default function MessagesManagePage() {
  const { t } = useLocale();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: "SYSTEM",
    title: "",
    content: "",
    link: "",
    userId: "",
    sendToAll: false,
  });

  const notificationTypes = [
    { value: "SYSTEM", label: "系统通知" },
    { value: "QUOTE", label: "询价相关" },
    { value: "ORDER", label: "订单相关" },
    { value: "PROMOTION", label: "促销活动" },
    { value: "NEWS", label: "新闻动态" },
    { value: "ALERT", label: "警告通知" },
  ];

  // 获取用户列表
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/users?limit=100');
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users);
        }
      } catch (err) {
        console.error('获取用户列表失败');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // 发送通知
  const sendNotification = async () => {
    if (!formData.title || !formData.content) {
      setError('请填写标题和内容');
      return;
    }

    if (!formData.sendToAll && !formData.userId) {
      setError('请选择接收用户或选择发送给所有用户');
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(data.message || '通知发送成功');
        setShowDialog(false);
        setFormData({
          type: "SYSTEM",
          title: "",
          content: "",
          link: "",
          userId: "",
          sendToAll: false,
        });
      } else {
        const errData = await response.json();
        setError(errData.error || '发送通知失败');
      }
    } catch (err) {
      setError('发送通知失败');
    } finally {
      setSending(false);
    }
  };

  // 快速发送模板
  const quickTemplates = [
    {
      title: "系统维护通知",
      type: "SYSTEM",
      content: "系统将于今晚 22:00 - 次日 02:00 进行维护升级，届时系统将暂时无法访问，请提前做好相关准备。",
    },
    {
      title: "新功能上线",
      type: "NEWS",
      content: "我们很高兴地宣布，新功能已正式上线！您现在可以体验更多便捷的服务。",
    },
    {
      title: "促销活动",
      type: "PROMOTION",
      content: "限时优惠！即日起至本月底，所有物流服务享受9折优惠，不要错过这个好机会！",
    },
  ];

  const applyTemplate = (template: typeof quickTemplates[0]) => {
    setFormData(prev => ({
      ...prev,
      type: template.type,
      title: template.title,
      content: template.content,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            消息管理
          </h1>
          <p className="text-muted-foreground">发送和管理系统通知</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          发送新通知
        </Button>
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

      {/* 快捷模板 */}
      <Card>
        <CardHeader>
          <CardTitle>快捷模板</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {quickTemplates.map((template, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => {
                applyTemplate(template);
                setShowDialog(true);
              }}>
                <CardContent className="pt-4">
                  <h3 className="font-medium mb-2">{template.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{template.content}</p>
                  <Badge variant="outline" className="mt-2">
                    {notificationTypes.find(t => t.value === template.type)?.label}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 用户统计 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            用户统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted rounded-lg text-center">
              <div className="text-2xl font-bold">{users.length}</div>
              <div className="text-sm text-muted-foreground">总用户数</div>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <div className="text-2xl font-bold">{users.filter(u => u.name).length}</div>
              <div className="text-sm text-muted-foreground">已设置名称</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 发送通知对话框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>发送通知</DialogTitle>
            <DialogDescription>
              创建并发送系统通知给用户
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>通知类型</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {notificationTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>标题 *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="输入通知标题"
              />
            </div>

            <div className="space-y-2">
              <Label>内容 *</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="输入通知内容"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>跳转链接（可选）</Label>
              <Input
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="例如: /user/quotes"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>发送给所有用户</Label>
                <p className="text-xs text-muted-foreground">将通知发送给所有注册用户</p>
              </div>
              <Switch
                checked={formData.sendToAll}
                onCheckedChange={(checked) => setFormData({ ...formData, sendToAll: checked, userId: "" })}
              />
            </div>

            {!formData.sendToAll && (
              <div className="space-y-2">
                <Label>选择用户</Label>
                <Select 
                  value={formData.userId} 
                  onValueChange={(value) => setFormData({ ...formData, userId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择接收用户" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button onClick={sendNotification} disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  发送中...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  发送通知
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
