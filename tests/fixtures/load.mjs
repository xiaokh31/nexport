import { pathToFileURL } from "node:url";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { assertTestRuntime } from "../../scripts/test/database-safety.mjs";
import { cleanupTestData } from "./cleanup.mjs";
import { fixtureUsers } from "./users.mjs";

export async function loadTestFixtures(prisma) {
  await cleanupTestData(prisma);
  await prisma.user.createMany({ data: fixtureUsers });
}

async function main() {
  const settings = assertTestRuntime(process.env);
  const prisma = new PrismaClient({ datasourceUrl: settings.databaseUrl });

  try {
    await loadTestFixtures(prisma);
    console.info(
      `Loaded ${fixtureUsers.length} role fixtures into ${settings.databaseName}.`,
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
