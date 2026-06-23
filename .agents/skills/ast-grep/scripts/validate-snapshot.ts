#!/usr/bin/env bun
import { resolve } from "node:path";
import {
  validateSnapshotFull,
  type DoctorSnapshotV2,
} from "./scan/transpiler/snapshot.ts";

const SKILL_ROOT = resolve(import.meta.dir, "..");

async function main(): Promise<void> {
  const file = process.argv[2];
  const scannerVersion = process.argv.find((a) => a.startsWith("--scanner-version="))
    ?.split("=")[1]
    ?? process.env.SUPPLY_CHAIN_SCANNER_VERSION;
  if (!file) {
    console.error("Usage: bun scripts/validate-snapshot.ts <snapshot.json> [--scanner-version=2.0.0]");
    process.exit(1);
  }
  const snapshot = JSON.parse(await Bun.file(file).text()) as DoctorSnapshotV2;
  const result = await validateSnapshotFull({
    skillRoot: SKILL_ROOT,
    snapshot,
    scannerVersion,
  });

  const ok = result.version.compatible
    && result.sections.length === 0
    && result.scanner.compatible;

  const payload = { ...result, ok };
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);

  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});