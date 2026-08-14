import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { requireAuthRuntimeConfig } from "@/config/env/server";
import { EnvironmentConfigurationError } from "@/config/env/shared";

const authHandler = NextAuth(authOptions);

async function handler(...args: Parameters<typeof authHandler>) {
  try {
    requireAuthRuntimeConfig();
    return authHandler(...args);
  } catch (error) {
    if (error instanceof EnvironmentConfigurationError) {
      console.error("Authentication configuration error:", error.message);
      return NextResponse.json(
        { error: "Authentication service is not configured" },
        { status: 503 }
      );
    }

    throw error;
  }
}

export { handler as GET, handler as POST };
