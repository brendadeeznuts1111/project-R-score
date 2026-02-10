#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SERVER_PATH = join(ROOT, "scratch", "bun-v1.3.9-examples", "playground-web", "server.ts");
const CONTRACT_PATH = join(ROOT, "scratch", "bun-v1.3.9-examples", "playground-web", "demo-module-contract.json");

function parseArg(name: string): string {
  const prefix = `--${name}=`;
  const hit = Bun.argv.find((arg) => arg.startsWith(prefix));
  if (hit) return hit.slice(prefix.length).trim();
  const idx = Bun.argv.findIndex((arg) => arg === `--${name}`);
  if (idx >= 0) return String(Bun.argv[idx + 1] || "").trim();
  return "";
}

function collectDemoIds(source: string): string[] {
  const start = source.indexOf("const DEMOS_BASE = [");
  const end = source.indexOf("\n\nasync function runCommand", start);
  const block = start >= 0 && end >= 0 ? source.slice(start, end) : "";
  return [...block.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);
}

function main() {
  const id = parseArg("id");
  if (!id) {
    console.error("[demo-test] missing --id=<demo-id>");
    process.exit(1);
  }

  const serverSource = readFileSync(SERVER_PATH, "utf8");
  const demoIds = collectDemoIds(serverSource);
  if (!demoIds.includes(id)) {
    console.error(`[demo-test] unknown demo id '${id}'`);
    process.exit(1);
  }

  const contract = JSON.parse(readFileSync(CONTRACT_PATH, "utf8")) as {
    modules: Record<string, { testCommand?: string; benchCommand?: string; language?: string; flags?: string[] }>;
  };
  const meta = contract.modules[id];
  if (!meta) {
    console.error(`[demo-test] missing contract entry for '${id}'`);
    process.exit(1);
  }
  if (!meta.testCommand || !meta.benchCommand || !meta.language || !Array.isArray(meta.flags)) {
    console.error(`[demo-test] incomplete contract for '${id}'`);
    process.exit(1);
  }

  console.log(`[demo-test][pass] id=${id} language=${meta.language} flags=${meta.flags.length}`);
}

main();
