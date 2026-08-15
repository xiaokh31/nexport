import { NextResponse } from "next/server";
import { currentSessionActor } from "@/lib/authorization";
import { getCapabilities, getDefaultAdminPath } from "@/lib/permissions";

export async function GET() {
  const actor = await currentSessionActor();
  if (!actor) {
    return NextResponse.json(
      { error: "请先登录", code: "UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  return NextResponse.json({
    subject: {
      role: actor.role,
      canManageArticles: actor.canManageArticles,
    },
    capabilities: getCapabilities(actor),
    defaultPath: getDefaultAdminPath(actor),
  });
}
