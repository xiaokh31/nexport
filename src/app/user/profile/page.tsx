"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Save, Upload } from "lucide-react";
import { useLocale } from "@/i18n/locale-context";

const profileSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  phone: z.string().optional(),
  company: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  image?: string;
  role: string;
}

export default function ProfilePage() {
  const { t } = useLocale();
  const { data: session, update: updateSession } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
    },
  });

  // 获取用户数据
  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          form.reset({
            name: data.user.name || "",
            email: data.user.email || "",
            phone: data.user.phone || "",
            company: data.user.company || "",
          });
        } else {
          const errData = await response.json();
          setError(errData.error || "获取用户数据失败");
        }
      } catch (err) {
        setError("获取用户数据失败");
      } finally {
        setIsFetching(false);
      }
    }

    if (session?.user) {
      fetchUser();
    }
  }, [session, form]);

  async function onSubmit(data: ProfileFormValues) {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          phone: data.phone,
          company: data.company,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setUser(result.user);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
        
        // 更新session中的用户名
        if (result.user.name !== session?.user?.name) {
          await updateSession({ name: result.user.name });
        }
      } else {
        const errData = await response.json();
        setError(errData.error || "更新失败");
      }
    } catch (err) {
      setError("更新失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  }

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="text-center py-12 text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.user.profileTitle}</h1>
        <p className="text-muted-foreground">{t.user.profileDescription}</p>
      </div>

      {/* Avatar Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t.user.avatar}</CardTitle>
          <CardDescription>{t.user.avatarHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user?.image || session?.user?.image || undefined} />
              <AvatarFallback className="text-2xl">
                {(user?.name || session?.user?.name)?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              {t.user.uploadAvatar}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t.user.basicInfo}</CardTitle>
          <CardDescription>{t.user.updateProfile}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">
              {error}
            </div>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.user.name}</FormLabel>
                      <FormControl>
                        <Input placeholder={t.user.namePlaceholder} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.user.emailLabel}</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder={t.user.emailPlaceholder} {...field} disabled />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.user.phone}</FormLabel>
                      <FormControl>
                        <Input placeholder={t.user.phonePlaceholder} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.user.company}</FormLabel>
                      <FormControl>
                        <Input placeholder={t.user.companyPlaceholder} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center gap-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t.user.saving}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {t.user.saveChanges}
                    </>
                  )}
                </Button>
                {isSaved && (
                  <span className="text-sm text-green-600">{t.user.saveSuccess}</span>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
