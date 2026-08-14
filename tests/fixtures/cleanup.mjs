import { pathToFileURL } from "node:url";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { assertTestRuntime } from "../../scripts/test/database-safety.mjs";

export async function cleanupTestData(prisma) {
  await prisma.$transaction([
    prisma.notificationBroadcast.deleteMany(),
    prisma.emailOutbox.deleteMany(),
    prisma.rateLimitBucket.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.quoteEvent.deleteMany(),
    prisma.quote.deleteMany(),
    prisma.article.deleteMany(),
    prisma.setting.deleteMany(),
    prisma.loginHistory.deleteMany(),
    prisma.account.deleteMany(),
    prisma.session.deleteMany(),
    prisma.verificationToken.deleteMany(),
    prisma.page.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function main() {
  const settings = assertTestRuntime(process.env);
  const prisma = new PrismaClient({ datasourceUrl: settings.databaseUrl });

  try {
    await cleanupTestData(prisma);
    console.info(`Cleaned isolated test database ${settings.databaseName}.`);
  } finally {
    await prisma.$disconnect();
  }
}

const isMainModule = process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMainModule) {
  await main();
}
