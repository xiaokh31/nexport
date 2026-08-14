import { fileURLToPath } from "node:url";
import path from "node:path";
import { createTestProcessEnvironment } from "./database-safety.mjs";
import { runTestDatabaseAction } from "./database.mjs";
import { runCommand } from "./run-command.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const testEnvironment = createTestProcessEnvironment(process.env);
let databaseStarted = false;
let baselineDeployed = false;

try {
  // The dedicated compose project and tmpfs guarantee an empty local database.
  runTestDatabaseAction("down", testEnvironment);
  databaseStarted = true;
  runTestDatabaseAction("up", testEnvironment);

  runCommand("pnpm", ["prisma:generate"], {
    cwd: projectRoot,
    env: testEnvironment,
  });
  runCommand("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    cwd: projectRoot,
    env: testEnvironment,
  });
  baselineDeployed = true;

  runCommand("pnpm", ["test"], {
    cwd: projectRoot,
    env: testEnvironment,
  });
  runCommand("node", ["scripts/test/run-suite.mjs", "integration"], {
    cwd: projectRoot,
    env: testEnvironment,
  });
  runCommand("node", ["scripts/test/run-suite.mjs", "e2e"], {
    cwd: projectRoot,
    env: testEnvironment,
  });
} finally {
  try {
    if (baselineDeployed) {
      runCommand("node", ["tests/fixtures/cleanup.mjs"], {
        cwd: projectRoot,
        env: testEnvironment,
      });
    }
  } finally {
    if (databaseStarted) {
      runTestDatabaseAction("down", testEnvironment);
    }
  }
}
