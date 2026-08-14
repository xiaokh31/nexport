import { fileURLToPath } from "node:url";
import path from "node:path";
import { createTestProcessEnvironment } from "./database-safety.mjs";
import { runCommand } from "./run-command.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const suite = process.argv[2];
const testEnvironment = createTestProcessEnvironment(process.env);

if (suite !== "integration" && suite !== "e2e") {
  throw new Error("Usage: node scripts/test/run-suite.mjs <integration|e2e>");
}

let fixturesMayExist = false;

try {
  runCommand("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    cwd: projectRoot,
    env: testEnvironment,
  });
  fixturesMayExist = true;
  runCommand("node", ["tests/fixtures/load.mjs"], {
    cwd: projectRoot,
    env: testEnvironment,
  });
  if (suite === "integration") {
    runCommand(
      "pnpm",
      ["exec", "vitest", "run", "--config", "vitest.integration.config.ts"],
      { cwd: projectRoot, env: testEnvironment },
    );
  } else {
    runCommand("pnpm", ["exec", "playwright", "test"], {
      cwd: projectRoot,
      env: testEnvironment,
    });
  }
} finally {
  if (fixturesMayExist) {
    runCommand("node", ["tests/fixtures/cleanup.mjs"], {
      cwd: projectRoot,
      env: testEnvironment,
    });
  }
}
