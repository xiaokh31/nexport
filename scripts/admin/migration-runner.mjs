import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  formatDatabaseTargetSummary,
  validateDatabaseTarget,
} from "./database-target.mjs";

const SUPPORTED_ACTIONS = new Set(["status", "deploy"]);

export function parseMigrationAction(argv) {
  const action = argv[0];
  if (!action || !SUPPORTED_ACTIONS.has(action) || argv.length !== 1) {
    throw new Error("Usage: migration-runner.mjs <status|deploy>");
  }
  return action;
}

function runPrismaMigration(
  command,
  environment = process.env,
  { allowPendingStatus = false } = {},
) {
  const result = spawnSync("pnpm", ["exec", "prisma", "migrate", command], {
    env: environment,
    stdio: "inherit",
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !(allowPendingStatus && result.status === 1)) {
    throw new Error(`prisma migrate ${command} exited with ${result.status}.`);
  }
}

export function runMigration(action, environment = process.env) {
  const target = validateDatabaseTarget(environment, {
    requireBackup: true,
    requireProductionConfirmation: action === "deploy",
  });
  console.info(formatDatabaseTargetSummary(target));
  runPrismaMigration("status", environment, {
    allowPendingStatus: action === "deploy",
  });
  if (action === "deploy") runPrismaMigration("deploy", environment);
}

async function main() {
  runMigration(parseMigrationAction(process.argv.slice(2)));
}

const isMainModule = process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMainModule) {
  await main();
}
