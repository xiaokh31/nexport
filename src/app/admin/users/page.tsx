"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Search, MoreHorizontal, UserCog, Ban, Trash2, Loader2, Save, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useLocale } from "@/i18n/locale-context";

interface User {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  company: string | null;
  role: string;
  emailVerified: boolean | null;
  image?: string;
  canManageArticles?: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function UsersManagePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    company: "",
    role: "",
    canManageArticles: false,
  });
  const { t } = useLocale();

  const roleMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    ADMIN: { label: "管理员", variant: "default" },
    STAFF: { label: "员工", variant: "secondary" },
    WAREHOUSE: { label: "仓库管理", variant: "secondary" },
    FINANCE: { label: "财务", variant: "secondary" },
    CUSTOMER: { label: "客户", variant: "outline" },
    PARTNER: { label: "合作伙伴", variant: "outline" },
  };

  // 获取用户列表
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "10",
          role: roleFilter,
          search: searchTerm,
        });
        
        const response = await fetch(`/api/admin/users?${params}`);
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users);
          setTotal(data.total);
        } else {
          const errorData = await response.json();
          setError(errorData.error || "获取用户列表失败");
        }
      } catch (err) {
        setError("获取用户列表失败");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [page, roleFilter, searchTerm]);

  // 打开编辑对话框
  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || "",
      phone: user.phone || "",
      company: user.company || "",
      role: user.role,
      canManageArticles: user.canManageArticles || false,
    });
    setShowEditDialog(true);
  };

  // 切换员工文章管理权限
  const toggleArticlePermission = async (user: User) => {
    const newValue = !user.canManageArticles;
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, canManageArticles: newValue }),
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(users.map(u => u.id === user.id ? { ...u, canManageArticles: newValue } : u));
      } else {
        const errorData = await response.json();
        alert(errorData.error || "更新权限失败");
      }
    } catch (err) {
      alert("更新权限失败");
    }
  };

  // 保存用户信息
  const saveUser = async () => {
    if (!selectedUser) return;
    
    setSaving(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedUser.id,
          ...editForm,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(users.map(u => u.id === selectedUser.id ? data.user : u));
        setShowEditDialog(false);
      } else {
        const errorData = await response.json();
        alert(errorData.error || "保存失败");
      }
    } catch (err) {
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  };

  // 更新用户角色
  const updateUserRole = async (id: string, role: string) => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, role }),
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(users.map(u => u.id === id ? data.user : u));
      } else {
        const errorData = await response.json();
        alert(errorData.error || "更新角色失败");
      }
    } catch (err) {
      alert("更新角色失败");
    }
  };

  // 删除用户
  const deleteUser = async (id: string) => {
    if (!confirm("确定要删除此用户吗？此操作不可撤销。")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setUsers(users.filter(user => user.id !== id));
        setTotal(total - 1);
      } else {
        const errorData = await response.json();
        alert(errorData.error || "删除用户失败");
      }
    } catch (err) {
      alert("删除用户失败");
    }
  };

  if (error) {
    return (
      <div className="container py-8 text-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">用户管理</h1>
        <p className="text-muted-foreground">管理系统用户和权限</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>用户列表</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索用户名或邮箱..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <Select value={roleFilter} onValueChange={(value) => {
                setRoleFilter(value);
                setPage(1);
              }}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="角色" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="ADMIN">管理员</SelectItem>
                  <SelectItem value="STAFF">员工</SelectItem>
                  <SelectItem value="CUSTOMER">客户</SelectItem>
                  <SelectItem value="PARTNER">合作伙伴</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户</TableHead>
                    <TableHead>邮箱</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>文章权限</TableHead>
                    <TableHead>注册日期</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length > 0 ? (
                    users.map((user) => {
                      const role = roleMap[user.role] || { label: user.role, variant: "outline" as const };
                      
                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.image || undefined} />
                                <AvatarFallback>
                                  {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="font-medium">{user.name || '未设置'}</span>
                                {user.company && (
                                  <p className="text-xs text-muted-foreground">{user.company}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Select 
                              value={user.role} 
                              onValueChange={(value) => updateUserRole(user.id, value)}
                            >
                              <SelectTrigger className="w-28 h-8">
                                <Badge variant={role.variant} className="w-full justify-center">
                                  {role.label}
                                </Badge>
                              </SelectTrigger>
                              <SelectContent position="popper" sideOffset={4}>
                                <SelectItem value="ADMIN">管理员</SelectItem>
                                <SelectItem value="STAFF">员工</SelectItem>
                                <SelectItem value="WAREHOUSE">仓库管理</SelectItem>
                                <SelectItem value="FINANCE">财务</SelectItem>
                                <SelectItem value="CUSTOMER">客户</SelectItem>
                                <SelectItem value="PARTNER">合作伙伴</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {user.role === 'STAFF' ? (
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={user.canManageArticles || false}
                                  onCheckedChange={() => toggleArticlePermission(user)}
                                />
                                <span className="text-xs text-muted-foreground">
                                  {user.canManageArticles ? '已开启' : '未开启'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {user.role === 'ADMIN' ? '管理员默认有权限' : '-'}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                  <UserCog className="h-4 w-4 mr-2" />
                                  编辑信息
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => deleteUser(user.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  删除用户
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        暂无用户数据
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              {/* 分页 */}
              {total > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    显示第 {(page - 1) * 10 + 1}-{Math.min(page * 10, total)} 条，共 {total} 条
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= Math.ceil(total / 10)}
                      onClick={() => setPage(page + 1)}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 编辑用户对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户信息</DialogTitle>
            <DialogDescription>
              {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">用户名</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="输入用户名"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">电话</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="输入电话号码"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">公司</Label>
              <Input
                id="company"
                value={editForm.company}
                onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                placeholder="输入公司名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">角色</Label>
              <Select 
                value={editForm.role} 
                onValueChange={(value) => setEditForm({ ...editForm, role: value, canManageArticles: value === 'STAFF' ? editForm.canManageArticles : false })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">管理员</SelectItem>
                  <SelectItem value="STAFF">员工</SelectItem>
                  <SelectItem value="WAREHOUSE">仓库管理</SelectItem>
                  <SelectItem value="FINANCE">财务</SelectItem>
                  <SelectItem value="CUSTOMER">客户</SelectItem>
                  <SelectItem value="PARTNER">合作伙伴</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* 员工文章管理权限开关 */}
            {editForm.role === 'STAFF' && (
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="canManageArticles" className="font-medium">文章管理权限</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    允许该员工撰写和管理文章
                  </p>
                </div>
                <Switch
                  id="canManageArticles"
                  checked={editForm.canManageArticles}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, canManageArticles: checked })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={saveUser} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  保存
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
