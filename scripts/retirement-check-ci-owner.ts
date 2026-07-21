#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Retirement condition probe: is this tenant CI-owned (spine no longer required)?
 *
 *   bun scripts/retirement-check-ci-owner.ts --tenant=docs-integrity
 *
 * SSOT: lib/harness/ci-owned-tenants.json — set tenants.<id> = true only after
 * a required CI / operate schedule owns the periodic re-proof.
 */
import { joinPath } from '../lib/path-bun';

const ROOT = joinPath(import.meta.dir, '..');
const REGISTRY = joinPath(ROOT, 'lib/harness/ci-owned-tenants.json');

function parseTenant(argv: string[]): string | undefined {
  const eq = argv.find(a => a.startsWith('--tenant='));
  if (eq) return eq.slice('--tenant='.length);
  const i = argv.indexOf('--tenant');
  if (i !== -1) return argv[i + 1];
  return undefined;
}

const tenant = parseTenant(Bun.argv.slice(2));
if (!tenant) {
  console.error('usage: bun scripts/retirement-check-ci-owner.ts --tenant=<id>');
  process.exit(2);
}

const reg = (await Bun.file(REGISTRY).json()) as {
  tenants?: Record<string, boolean>;
};
const owned = reg.tenants?.[tenant];
if (owned === undefined) {
  console.error(`❌ ${tenant}: missing from ${REGISTRY}`);
  process.exit(1);
}
if (!owned) {
  console.error(
    `❌ ${tenant}: still spine-owned (set tenants.${tenant}=true in ci-owned-tenants.json when CI owns the re-proof)`
  );
  process.exit(1);
}
console.info(`✅ ${tenant}: CI-owned — retirement condition met`);
process.exit(0);
