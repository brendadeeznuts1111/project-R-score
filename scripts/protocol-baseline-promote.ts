#!/usr/bin/env bun

import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

type PromoteOptions = {
  baselinePath: string;
  comparePath: string;
};

function getArg(name: string): string {
  const direct = Bun.argv.find((arg) => arg.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const idx = Bun.argv.findIndex((arg) => arg === name);
  return idx >= 0 && idx + 1 < Bun.argv.length ? Bun.argv[idx + 1] : "";
}

function parseOptions(): PromoteOptions {
  return {
    baselinePath: getArg("--baseline") || "reports/protocol-parallel.baseline.json",
    comparePath: getArg("--compare") || "reports/protocol-parallel.compare.json",
  };
}

async function runCompareGate(): Promise<number> {
  const proc = Bun.spawn(["bun", "run", "test:protocol:parallel:compare"], {
    cwd: process.cwd(),
    stdout: "inherit",
    stderr: "inherit",
  });
  return await proc.exited;
}

async function promoteBaseline(options: PromoteOptions): Promise<void> {
  const baselineFile = Bun.file(options.baselinePath);
  const compareFile = Bun.file(options.comparePath);

  const compareExists = await compareFile.exists();
  if (!compareExists) {
    throw new Error(`Compare report not found: ${options.comparePath}`);
  }

  const baselineExists = await baselineFile.exists();
  if (baselineExists) {
    const archiveDir = join(dirname(options.baselinePath), "archive");
    await mkdir(archiveDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const archivePath = join(archiveDir, `protocol-parallel.baseline.${ts}.json`);
    await Bun.write(archivePath, baselineFile);
    console.log(`Archived previous baseline -> ${archivePath}`);
  }

  await Bun.write(options.baselinePath, compareFile);
  console.log(`Promoted baseline -> ${options.baselinePath}`);
}

async function main() {
  const options = parseOptions();
  const exitCode = await runCompareGate();
  if (exitCode !== 0) {
    console.error(`Compare gate failed with exit code ${exitCode}. Baseline not promoted.`);
    process.exit(exitCode);
  }

  await promoteBaseline(options);
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
