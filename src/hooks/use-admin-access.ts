"use client";

import { useEffect, useState } from "react";
import type { AdminAccessProfile } from "@/lib/permissions";

export function useAdminAccess(sessionUserId: string | undefined) {
  const enabled = Boolean(sessionUserId);
  const [profile, setProfile] = useState<AdminAccessProfile | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [resolvedUserId, setResolvedUserId] = useState<string | undefined>();

  useEffect(() => {
    if (!enabled) {
      setProfile(null);
      setLoading(false);
      setError(null);
      setResolvedUserId(undefined);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

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
        if (!controller.signal.aborted) setProfile(nextProfile);
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
        if (!controller.signal.aborted) {
          setResolvedUserId(sessionUserId);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [enabled, sessionUserId]);

  return {
    profile,
    loading: enabled && (loading || resolvedUserId !== sessionUserId),
    error,
  };
}
