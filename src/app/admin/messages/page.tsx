"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2, Plus, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { WorkspaceEmpty, WorkspacePageHeader, WorkspacePanel } from "@/components/workspace/workspace-ui";

interface User { id: string; name: string | null; email: string }

const emptyForm = {
  requestKey: "",
  type: "SYSTEM",
  title: "",
  content: "",
  link: "",
  userId: "",
  sendToAll: false,
};

export default function NotificationsManagePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [sending, setSending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [broadcastArmed, setBroadcastArmed] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const notificationTypes = [
    ["SYSTEM", "系统通知"], ["QUOTE", "询价相关"], ["ORDER", "订单相关"],
    ["PROMOTION", "促销活动"], ["NEWS", "新闻动态"], ["ALERT", "警告通知"],
  ] as const;

  const templates = [
    { title: "询价资料补充提醒", type: "QUOTE", content: "请登录客户工作台查看询价，并按通知要求补充缺少的资料。" },
    { title: "账户安全提醒", type: "ALERT", content: "如发现非本人登录活动，请立即修改密码并联系管理员。" },
    { title: "服务公告", type: "SYSTEM", content: "请在发送前填写公告的准确时间、影响范围和下一步操作。" },
  ];

  useEffect(() => {
    let active = true;
    async function fetchUsers() {
      try {
        const response = await fetch("/api/admin/users?limit=100", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "获取用户列表失败");
        if (active) {
          setUsers(data.users || []);
          setUserTotal(data.total || 0);
        }
      } catch (requestError) {
        if (active) setError(requestError instanceof Error ? requestError.message : "获取用户列表失败");
      } finally {
        if (active) setLoadingUsers(false);
      }
    }
    void fetchUsers();
    return () => { active = false; };
  }, []);

  function openDialog() {
    setFormData({ ...emptyForm, requestKey: crypto.randomUUID() });
    setBroadcastArmed(false);
    setError(null);
    setDialogOpen(true);
  }

  function applyTemplate(template: (typeof templates)[number]) {
    setFormData({ ...emptyForm, requestKey: crypto.randomUUID(), type: template.type, title: template.title, content: template.content });
    setBroadcastArmed(false);
    setError(null);
    setDialogOpen(true);
  }

  async function sendNotification() {
    if (!formData.title.trim() || !formData.content.trim()) {
      setError("请填写标题和内容");
      return;
    }
    if (!formData.sendToAll && !formData.userId) {
      setError("请选择接收用户或选择发送给所有用户");
      return;
    }
    if (formData.sendToAll && !broadcastArmed) {
      setBroadcastArmed(true);
      setError(null);
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "发送通知失败");
      setSuccess(data.message || "通知发送成功");
      setDialogOpen(false);
      setFormData(emptyForm);
      setBroadcastArmed(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "发送通知失败");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow="后台工作台"
        title="通知管理"
        description="向指定用户或全部已注册用户发送真实通知；广播发送采用二次确认。"
        actions={<Button onClick={openDialog}><Plus aria-hidden="true" className="mr-2 h-4 w-4" />发送新通知</Button>}
      />
      {error && !dialogOpen ? <div role="alert" aria-live="assertive" className="border-l-4 border-destructive bg-destructive/5 p-3 text-sm text-destructive">{error}</div> : null}
      {success ? <div role="status" aria-live="polite" className="border-l-4 border-success bg-success/5 p-3 text-sm text-success">{success}</div> : null}

      <WorkspacePanel title="通知模板" description="模板只预填可核对的操作说明，发送前仍需确认接收范围。" icon={Bell}>
        <div className="grid gap-3 md:grid-cols-3">
          {templates.map((template) => (
            <button key={template.title} type="button" onClick={() => applyTemplate(template)} className="border border-border bg-paper-white p-4 text-left transition-colors hover:border-dock-navy hover:bg-concrete/35">
              <span className="font-semibold">{template.title}</span>
              <span className="mt-2 line-clamp-3 block text-sm text-muted-foreground">{template.content}</span>
              <Badge variant="outline" className="mt-3">{notificationTypes.find(([value]) => value === template.type)?.[1]}</Badge>
            </button>
          ))}
        </div>
      </WorkspacePanel>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!sending) setDialogOpen(open); }}>
        <DialogContent className="max-h-[88svh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>发送通知</DialogTitle><DialogDescription>核对内容和接收范围后发送；广播操作需要再次确认。</DialogDescription></DialogHeader>
          <div className="space-y-4">
            {error ? <div role="alert" aria-live="assertive" className="border-l-4 border-destructive bg-destructive/5 p-3 text-sm text-destructive">{error}</div> : null}
            <div className="space-y-2"><Label htmlFor="notification-type">通知类型</Label><Select value={formData.type} onValueChange={(value) => { setFormData((current) => ({ ...current, type: value })); setBroadcastArmed(false); }}><SelectTrigger id="notification-type"><SelectValue /></SelectTrigger><SelectContent>{notificationTypes.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="notification-title">标题 *</Label><Input id="notification-title" maxLength={200} value={formData.title} onChange={(event) => { setFormData((current) => ({ ...current, title: event.target.value })); setBroadcastArmed(false); }} /></div>
            <div className="space-y-2"><Label htmlFor="notification-content">内容 *</Label><Textarea id="notification-content" maxLength={4000} rows={5} value={formData.content} onChange={(event) => { setFormData((current) => ({ ...current, content: event.target.value })); setBroadcastArmed(false); }} /></div>
            <div className="space-y-2"><Label htmlFor="notification-link">站内链接（可选）</Label><Input id="notification-link" maxLength={500} placeholder="例如：/user/quotes" value={formData.link} onChange={(event) => { setFormData((current) => ({ ...current, link: event.target.value })); setBroadcastArmed(false); }} /></div>
            <div className="flex items-center justify-between gap-4 border-y border-border py-4"><div><Label htmlFor="send-to-all">发送给所有用户</Label><p id="send-to-all-hint" className="mt-1 text-xs text-muted-foreground">当前共 {userTotal} 位已注册用户；实际接收数由服务端在发送时确认。</p></div><Switch id="send-to-all" aria-describedby="send-to-all-hint" checked={formData.sendToAll} onCheckedChange={(checked) => { setFormData((current) => ({ ...current, sendToAll: checked, userId: "" })); setBroadcastArmed(false); }} /></div>
            {!formData.sendToAll ? (
              <div className="space-y-2">
                <Label htmlFor="notification-user">接收用户</Label>
                {loadingUsers ? <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />正在读取用户…</div> : users.length ? <Select value={formData.userId} onValueChange={(value) => setFormData((current) => ({ ...current, userId: value }))}><SelectTrigger id="notification-user"><SelectValue placeholder="选择接收用户" /></SelectTrigger><SelectContent>{users.map((user) => <SelectItem key={user.id} value={user.id}>{user.name || user.email}</SelectItem>)}</SelectContent></Select> : <WorkspaceEmpty title="没有可选择的用户" description="创建用户后再发送单用户通知，或核对后使用全部用户广播。" />}
              </div>
            ) : null}
            {broadcastArmed ? <div role="alert" className="border-l-4 border-signal-amber bg-signal-amber/10 p-3 text-sm"><strong>广播确认：</strong>下一次点击将向全部符合条件的用户发送，发送后不能撤回。</div> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={sending} onClick={() => setDialogOpen(false)}>取消</Button>
            <Button disabled={sending || loadingUsers} onClick={() => void sendNotification()}>
              {sending ? <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" /> : <Send aria-hidden="true" className="mr-2 h-4 w-4" />}
              {formData.sendToAll ? (broadcastArmed ? "确认广播给全部用户" : "核对广播范围") : "发送给所选用户"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
