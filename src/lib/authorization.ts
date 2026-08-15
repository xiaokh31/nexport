import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  authorizeCapability,
  type Capability,
  type CapabilityActor,
  type UserRole,
} from "@/lib/permissions";

export async function loadCurrentActor(userId: string): Promise<CapabilityActor | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      canManageArticles: true,
    },
  });

  return user
    ? {
        ...user,
        role: user.role as UserRole,
        canManageArticles: user.role === "STAFF" && user.canManageArticles,
      }
    : null;
}

export async function currentSessionActor(): Promise<CapabilityActor | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ? loadCurrentActor(session.user.id) : null;
}

export async function requireCapability(
  capability: Capability,
): Promise<
  | { authorized: true; actor: CapabilityActor }
  | { authorized: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  const decision = await authorizeCapability(
    session?.user?.id,
    capability,
    loadCurrentActor,
  );

  if (decision.authorized) return decision;

  const unauthenticated = decision.reason === "UNAUTHENTICATED";
  return {
    authorized: false,
    response: NextResponse.json(
      {
        error: unauthenticated ? "请先登录" : "无权限访问",
        code: decision.reason,
      },
      { status: unauthenticated ? 401 : 403 },
    ),
  };
}
