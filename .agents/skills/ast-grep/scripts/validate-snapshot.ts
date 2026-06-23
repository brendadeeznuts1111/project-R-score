#!/usr/bin/env bun
import { resolve } from "node:path";
import { loadPolicyFromSkill } from "./scan/transpiler/policy-loader.ts";
import {
  validateSnapshotSections,
  validateSnapshotVersion,
  type DoctorSnapshotV2,
} from "./scan/transpiler/snapshot.ts";

const SKILL_ROOT = resolve(import.meta.dir, "..");

async function main(): Promise<void> {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: bun scripts/validate-snapshot.ts <snapshot.json>");
    process.exit(1);
  }
  const snapshot = JSON.parse(await Bun.file(file).text()) as DoctorSnapshotV2;
  const policy = await loadPolicyFromSkill(SKILL_ROOT);
  const version = validateSnapshotVersion(snapshot, policy);
  const missing = validateSnapshotSections(snapshot, policy);

  const payload = { version, missingSections: missing, ok: version.compatible && missing.length === 0 };
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);

  if (!payload.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});