#!/usr/bin/env bun
/**
 * [DOMAIN:CONFIG][SCOPE:CLI][TYPE:COMMANDS][META:INTEGRATION]
 * Config CLI: load, validate, watch, compress.
 *
 * Usage (paths relative to src/client/config unless absolute):
 *   bun run config load ui-themes.toml
 *   bun run config validate ui-themes.toml
 *   bun run config watch [ui-themes.toml shortcuts.toml ...]
 *   bun run config compress ui-themes.toml ./output.zst
 */

import { join } from "node:path";
import { ConfigLoader, loadSafe } from "../src/client/config/config-loader.ts";

const ROOT = join(import.meta.dir, "..");
const CONFIG_DIR = join(ROOT, "src/client/config");

const loader = new ConfigLoader();

async function cmdLoad(args: string[]): Promise<void> {
  const path = args[0];
  if (!path) {
    console.error("Usage: bun run config load <path>");
    process.exit(1);
  }
  const config = await loader.load(path, {
    basePath: CONFIG_DIR,
    hot: true,
  });
  if (config === null) {
    console.error("Failed to load config");
    process.exit(1);
  }
  console.log(Bun.inspect(config, { colors: true, depth: 3 }));
}

async function cmdValidate(args: string[]): Promise<void> {
  const path = args[0];
  if (!path) {
    console.error("Usage: bun run config validate <path>");
    process.exit(1);
  }
  const result = await loadSafe(path, { basePath: CONFIG_DIR }, loader);
  if (!result.success) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (typeof result.data !== "object" || result.data === null) {
    console.error("Invalid config: expected object");
    process.exit(1);
  }
  console.log("Valid");
}

function cmdWatch(args: string[]): Promise<void> {
  const paths = args.length ? args : [
    join(CONFIG_DIR, "ui-themes.toml"),
    join(CONFIG_DIR, "shortcuts.toml"),
  ];
  const watcher = loader.watch(
    paths,
    (event, path) => console.log(`[${event}] ${path}`),
    CONFIG_DIR,
  );
  process.on("SIGINT", () => {
    watcher.stop();
    process.exit(0);
  });
  console.log("Watching:", paths.join(", "));
  return new Promise(() => {});
}

async function cmdCompress(args: string[]): Promise<void> {
  const [input, output] = args;
  if (!input || !output) {
    console.error("Usage: bun run config compress <input> <output.zst>");
    process.exit(1);
  }
  const config = await loader.load(input, { basePath: CONFIG_DIR });
  if (config === null) {
    console.error("Failed to load config");
    process.exit(1);
  }
  const compressed = loader.compress(config);
  await Bun.write(output, compressed);
  console.log(`Compressed: ${compressed.length} bytes -> ${output}`);
}

async function main(): Promise<void> {
  const [command, ...params] = process.argv.slice(2);

  switch (command) {
    case "load":
      await cmdLoad(params);
      break;
    case "validate":
      await cmdValidate(params);
      break;
    case "watch":
      await cmdWatch(params);
      break;
    case "compress":
      await cmdCompress(params);
      break;
    default:
      console.error("Usage: bun run config <load|validate|watch|compress> [args]");
      process.exit(1);
  }
}

main();
