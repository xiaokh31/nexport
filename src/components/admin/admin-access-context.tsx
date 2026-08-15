"use client";

import { createContext, useContext } from "react";
import type { AdminAccessProfile } from "@/lib/permissions";

const AdminAccessContext = createContext<AdminAccessProfile | null>(null);

export const AdminAccessProvider = AdminAccessContext.Provider;

export function useAdminAccessContext() {
  const profile = useContext(AdminAccessContext);
  if (!profile) {
    throw new Error("AdminAccessProvider is required inside the admin layout");
  }
  return profile;
}
