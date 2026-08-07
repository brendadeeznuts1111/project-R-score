#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see lib/verification/proof-taxonomy.ts — PROOF_TAXONOMY_CONTRACTS
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Audit saved proof JSON artifacts against subsystem taxonomy contracts.
 *
 *   bun tools/verify-proof-taxonomy.ts [--json] [--save]
 *
 * Fails when any contract path is missing required subsystem / semanticTags fields
 * or cross-proof consistency checks fail (install-platform embed parity).
 * --save writes public/registry/proof-taxonomy-audit.json for the ops dashboard.
 */
import { resolvePath } from '../lib/path-bun.ts';
import { jsonOut } from '../lib/console-depth.ts';
import {
  runProofTaxonomyAudit,
  saveProofTaxonomyAudit,
} from '../lib/verification/proof-taxonomy.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('verify:proof-taxonomy', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const ROOT = resolvePath(import.meta.dir, '..');
const JSON_OUT = argv.includes('--json');
const save = argv.includes('--save');

if (import.meta.main) {
  const report = save ? await saveProofTaxonomyAudit(ROOT) : await runProofTaxonomyAudit(ROOT);
  const failedContracts = report.audits.filter(a => !a.ok);
  const failedConsistency = report.consistency.filter(c => !c.ok);

  if (save && !JSON_OUT) {
    console.log(`💾 Saved ${report.reportPath}`);
    if (report.proofHash) console.log(`   hash ${report.proofHash.slice(0, 16)}…`);
  }

  if (JSON_OUT) {
    jsonOut(report);
  } else {
    for (const a of report.audits) {
      const mark = a.ok ? '✅' : '❌';
      const detail =
        a.rows > 0 ? `${a.rows} rows` : a.notes[0]?.includes('missing file') ? 'missing' : 'report';
      console.log(`${mark} ${a.path} (${detail}) · ${a.primarySubsystem}`);
      if (!a.ok) {
        for (const note of a.notes) console.log(`   · ${note}`);
      }
    }
    if (report.consistency.length > 0) {
      console.log('');
      console.log('Cross-proof consistency');
      for (const c of report.consistency) {
        const mark = c.ok ? '✅' : '❌';
        console.log(`${mark} ${c.id}`);
        if (!c.ok) {
          for (const note of c.notes) console.log(`   · ${note}`);
        }
      }
    }
    console.log(
      `\n${report.audits.length - failedContracts.length}/${report.audits.length} contracts · ${report.consistency.length - failedConsistency.length}/${report.consistency.length} consistency · ${report.ok ? 'ok' : 'FAIL'}`
    );
  }

  if (!report.ok) process.exit(1);
}
