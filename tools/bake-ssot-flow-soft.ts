#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/guides/util/entrypoint — import.meta.main
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Offline SSOT soft-pass bake → `/registry/ssot-flow-soft.json`.
 *
 *   bun run ssot:flow:soft
 *   TENNIS_HQ_ROOT=/abs/path bun run ssot:flow:soft
 *
 * Runs Tennis HQ `ssot:build` → `ssot:check` → `ssot:pack` (no publish).
 *
 * @see lib/verification/ssot-flow-soft.ts
 * @see docs/harness/tenants/tennis-hq-registry.md
 */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { jsonOut, logTable } from '../lib/console-depth.ts';
import { joinPath } from '../lib/path-bun.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('ssot:flow:soft', Bun.argv.slice(2))
  : Bun.argv.slice(2);
import {
  runSsotFlowSoft,
  writeSsotFlowSoftProof,
  SSOT_FLOW_SOFT_REL,
} from '../lib/verification/ssot-flow-soft.ts';

const root = joinPath(import.meta.dir, '..');
const asJson = argv.includes('--json');

async function main(): Promise<number> {
  const proof = await runSsotFlowSoft({ factoryRoot: root });
  const out = await writeSsotFlowSoftProof(proof, root);

  if (asJson) {
    jsonOut(proof);
  } else {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  SSOT soft-pass (build · check · pack — no publish)      ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(`  package: ${proof.package.name}@${proof.package.version}`);
    console.log(`  tennis:  ${proof.tennisHqRoot}`);
    logTable(
      proof.steps.map(s => ({
        step: s.name,
        status: s.ok ? '✅' : '❌',
        detail: s.detail.slice(0, 72),
      })),
      ['step', 'status', 'detail']
    );
    console.log(
      `\n  artifact: ${proof.artifactName} · id=${proof.artifactId} · plane=${proof.plane} · purpose=${proof.purpose}`
    );
    console.log(
      `  summary: ${proof.summary.passed}/${proof.summary.total} · status=${proof.summary.status}`
    );
    if (proof.tarball) {
      console.log(
        `  tarball: ${proof.tarball.path} · ${proof.tarball.fileCount} files · sha256 ${proof.tarball.sha256.slice(0, 16)}…`
      );
    }
    console.log(`\n  ${proof.ok ? '✅' : '❌'} soft-pass ${proof.ok ? 'ok' : 'failed'}`);
    console.log(`  💾 ${SSOT_FLOW_SOFT_REL}`);
    console.log(`     → ${out}`);
  }

  return proof.ok ? 0 : 1;
}

if (isModuleEntrypoint(import.meta)) {
  process.exit(await main());
}
