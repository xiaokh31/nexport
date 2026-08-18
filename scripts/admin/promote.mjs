import { pathToFileURL } from "node:url";
import path from "node:path";
import {
  formatDatabaseTargetSummary,
  validateDatabaseTarget,
} from "./database-target.mjs";

export function parseEmailArgument(argv) {
  const inline = argv.find((argument) => argument.startsWith("--email="));
  const flagIndex = argv.indexOf("--email");
  const value = inline?.slice("--email=".length) ||
    (flagIndex >= 0 ? argv[flagIndex + 1] : undefined);
  const email = value?.normalize("NFC").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    throw new Error("Usage: pnpm admin:promote --email user@example.com");
  }
  return email;
}

export async function promoteVerifiedUserToAdmin(prisma, email) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { email } });
    if (!user) throw new Error(`No existing user found for ${email}.`);
    if (!user.emailVerified) {
      throw new Error(`User ${email} must verify their email before promotion.`);
    }

    if (user.role === "ADMIN" && !user.canManageArticles) {
      return { user, changed: false };
    }

    const promoted = await tx.user.update({
      where: { id: user.id },
      data: { role: "ADMIN", canManageArticles: false },
    });
    return { user: promoted, changed: true };
  });
}

async function main() {
  const email = parseEmailArgument(process.argv.slice(2));
  const target = validateDatabaseTarget(process.env, {
    requireBackup: false,
    requireProductionConfirmation: true,
  });
  console.info(formatDatabaseTargetSummary(target));
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });

  try {
    const result = await promoteVerifiedUserToAdmin(prisma, email);
    console.info(
      result.changed
        ? `Promoted verified user ${email} to ADMIN.`
        : `Verified user ${email} is already ADMIN; no change required.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

const isMainModule = process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMainModule) {
  await main();
}
