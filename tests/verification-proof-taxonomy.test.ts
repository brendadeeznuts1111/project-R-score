// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { joinPath, resolvePath } from '../lib/path-bun.ts';
import {
  auditProofTaxonomy,
  PROOF_TAXONOMY_CONTRACTS,
} from '../lib/verification/proof-taxonomy.ts';

const ROOT = resolvePath(import.meta.dir, '..');

describe('verification proof taxonomy contract', () => {
  for (const contract of PROOF_TAXONOMY_CONTRACTS) {
    test(`${contract.path} satisfies subsystem contract`, async () => {
      const file = Bun.file(joinPath(ROOT, contract.path));
      if (!(await file.exists())) {
        console.warn(`skip: ${contract.path} not generated yet — run ${contract.verifyScript} --save`);
        return;
      }
      const raw = (await file.json()) as Record<string, unknown>;
      const audit = auditProofTaxonomy(contract, raw);
      if (!audit.ok) {
        console.error(audit.notes.join('; '));
      }
      expect(audit.ok).toBe(true);
      if (contract.requireRowSubsystem && audit.rows > 0) {
        expect(audit.missingSubsystem).toBe(0);
      }
    });
  }

  test('release-features.json mixes runtime and package-manager subsystems', async () => {
    const file = Bun.file(joinPath(ROOT, 'public/registry/release-features.json'));
    if (!(await file.exists())) return;
    const proof = (await file.json()) as {
      results?: Array<{ subsystem?: string; name?: string }>;
      summary?: { bySubsystem?: Record<string, { passed: number; total: number }> };
    };
    const subs = new Set(proof.results?.map(r => r.subsystem).filter(Boolean));
    expect(subs.has('runtime')).toBe(true);
    expect(subs.has('package-manager')).toBe(true);
    expect(proof.summary?.bySubsystem?.runtime?.total).toBeGreaterThan(0);
    expect(proof.summary?.bySubsystem?.['package-manager']?.total).toBeGreaterThan(0);
  });

  test('networking-proof.json carries report-level subsystem', async () => {
    const file = Bun.file(joinPath(ROOT, 'public/registry/networking-proof.json'));
    if (!(await file.exists())) return;
    const proof = (await file.json()) as { subsystem?: string; targets?: unknown[] };
    expect(proof.subsystem).toBe('networking');
    expect(Array.isArray(proof.targets)).toBe(true);
  });

  test('bundler-loaders-proof.json is bundler-only with bySubsystem', async () => {
    const file = Bun.file(joinPath(ROOT, 'public/registry/bundler-loaders-proof.json'));
    if (!(await file.exists())) return;
    const proof = (await file.json()) as {
      results?: Array<{ subsystem?: string }>;
      summary?: { bySubsystem?: Record<string, { total: number }> };
      semanticTags?: { subsystems?: string[] };
    };
    expect(proof.results?.every(r => r.subsystem === 'bundler')).toBe(true);
    expect(proof.summary?.bySubsystem?.bundler?.total).toBeGreaterThan(0);
    expect(proof.semanticTags?.subsystems).toContain('bundler');
  });
});
