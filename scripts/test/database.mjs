import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { createTestProcessEnvironment } from "./database-safety.mjs";
import { runCommand } from "./run-command.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const composeFile = path.join(projectRoot, "compose.test.yml");

export function runTestDatabaseAction(action, environment = process.env) {
  const testEnvironment = createTestProcessEnvironment(environment);
  const baseArgs = [
    "compose",
    "--project-name",
    "nexport-test",
    "-f",
    composeFile,
  ];

  if (action === "up") {
    runCommand("docker", [...baseArgs, "up", "-d", "--wait"], {
      cwd: projectRoot,
      env: testEnvironment,
    });
    return;
  }
  if (action === "down") {
    runCommand(
      "docker",
      [...baseArgs, "down", "--volumes", "--remove-orphans"],
      { cwd: projectRoot, env: testEnvironment },
    );
    return;
  }
  if (action === "status") {
    runCommand("docker", [...baseArgs, "ps"], {
      cwd: projectRoot,
      env: testEnvironment,
    });
    return;
  }

  throw new Error("Usage: node scripts/test/database.mjs <up|down|status>");
}

const isMainModule = process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMainModule) {
  runTestDatabaseAction(process.argv[2]);
}
