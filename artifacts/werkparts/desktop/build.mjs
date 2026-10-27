import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const artifactDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(artifactDirectory, "../../..");
const frontendDirectory = path.resolve(artifactDirectory, "..");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const env = {
  ...process.env,
  BASE_PATH: "/",
  NODE_ENV: "production",
  PORT: "19996",
};

execFileSync(pnpm, ["run", "build"], {
  cwd: frontendDirectory,
  env,
  stdio: "inherit",
});
execFileSync(pnpm, ["--filter", "@workspace/api-server", "run", "desktop:build"], {
  cwd: workspaceRoot,
  env,
  stdio: "inherit",
});
