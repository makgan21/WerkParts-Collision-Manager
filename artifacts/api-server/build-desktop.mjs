import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, rm } from "node:fs/promises";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";

globalThis.require = createRequire(import.meta.url);

const apiDirectory = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.resolve(apiDirectory, "../werkparts/dist-desktop");

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

await esbuild({
  entryPoints: {
    main: path.resolve(apiDirectory, "src/desktop-main.ts"),
  },
  platform: "node",
  bundle: true,
  format: "cjs",
  target: "node22",
  outdir: outputDirectory,
  outExtension: { ".js": ".cjs" },
  external: ["electron"],
  sourcemap: "linked",
  logLevel: "info",
  plugins: [esbuildPluginPino({ transports: ["pino-pretty"] })],
  banner: {
    js: "globalThis.require = require; globalThis.__filename = __filename; globalThis.__dirname = __dirname;",
  },
});
