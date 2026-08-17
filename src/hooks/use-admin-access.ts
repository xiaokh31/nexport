"use client";

import { useEffect, useState } from "react";
import type { AdminAccessProfile } from "@/lib/permissions";

export function useAdminAccess(sessionUserId: string | undefined) {
  const enabled = Boolean(sessionUserId);
  const [profile, setProfile] = useState<AdminAccessProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolvedUserId, setResolvedUserId] = useState<string | undefined>();

  useEffect(() => {
    if (!sessionUserId) return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      if (!controller.signal.aborted) {
        setProfile(null);
        setError("权限检查超时，请重试或返回用户中心");
        setResolvedUserId(sessionUserId);
        controller.abort();
      }
    }, 10_000);

    fetch("/api/admin/access", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 401) return null;
        if (!response.ok) throw new Error("无法读取当前后台权限");
        return (await response.json()) as AdminAccessProfile;
      })
      .then((nextProfile) => {
        if (!controller.signal.aborted) {
          setProfile(nextProfile);
          setError(null);
        }
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setProfile(null);
          setError(
            requestError instanceof Error
              ? requestError.message
              : "无法读取当前后台权限",
          );
        }
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        if (!controller.signal.aborted) {
          setResolvedUserId(sessionUserId);
        }
      });

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [sessionUserId]);

  const resolved = enabled && resolvedUserId === sessionUserId;

  return {
    profile: resolved ? profile : null,
    loading: enabled && !resolved,
    error: resolved ? error : null,
  };
}
