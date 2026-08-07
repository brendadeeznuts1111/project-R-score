// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { joinPath, resolvePath } from '../lib/path-bun.ts';
import {
  auditProofTaxonomy,
  PROOF_TAXONOMY_CONTRACTS,
  PROOF_TAXONOMY_CONTRACT_COUNT,
} from '../lib/verification/proof-taxonomy.ts';

const ROOT = resolvePath(import.meta.dir, '..');

describe('verification proof taxonomy contract', () => {
  test('contract registry count is exported for edge gates', () => {
    expect(PROOF_TAXONOMY_CONTRACT_COUNT).toBe(PROOF_TAXONOMY_CONTRACTS.length);
    expect(PROOF_TAXONOMY_CONTRACT_COUNT).toBeGreaterThanOrEqual(13);
  });

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
        expect(audit.missingIntroducedIn).toBe(0);
        expect(audit.missingCanonicalKind).toBe(0);
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

  test('docs-coverage-proof.json carries report-level subsystem other', async () => {
    const file = Bun.file(joinPath(ROOT, 'public/registry/docs-coverage-proof.json'));
    if (!(await file.exists())) return;
    const proof = (await file.json()) as {
      subsystem?: string;
      type?: string;
      lanes?: unknown[];
      semanticTags?: { subsystems?: string[] };
    };
    expect(proof.subsystem).toBe('other');
    expect(proof.type).toBe('DocsCoverageVerificationReport');
    expect(Array.isArray(proof.lanes)).toBe(true);
    expect((proof.lanes ?? []).length).toBe(5);
    expect(proof.semanticTags?.subsystems).toContain('other');
  });

  test('registry-client-proof.json is package-manager with semanticTags', async () => {
    const file = Bun.file(joinPath(ROOT, 'public/registry/registry-client-proof.json'));
    if (!(await file.exists())) return;
    const proof = (await file.json()) as {
      results?: Array<{ subsystem?: string }>;
      semanticTags?: { subsystems?: string[] };
      summary?: { bySubsystem?: Record<string, { total: number }> };
    };
    expect(proof.results?.every(r => r.subsystem === 'package-manager')).toBe(true);
    expect(proof.semanticTags?.subsystems).toContain('package-manager');
    expect(proof.summary?.bySubsystem?.['package-manager']?.total).toBeGreaterThan(0);
  });

  test('doc-index.json carries report-level subsystem other', async () => {
    const file = Bun.file(joinPath(ROOT, 'public/registry/doc-index.json'));
    if (!(await file.exists())) return;
    const proof = (await file.json()) as {
      subsystem?: string;
      totalEntries?: number;
      defaultsCoverage?: { passed?: boolean };
    };
    expect(proof.subsystem).toBe('other');
    expect(proof.totalEntries).toBeGreaterThan(0);
    expect(proof.defaultsCoverage?.passed).toBe(true);
  });

  test('cloudflare-token-scope-proof.json carries subsystem other + mcp catalog', async () => {
    const file = Bun.file(joinPath(ROOT, 'public/registry/cloudflare-token-scope-proof.json'));
    if (!(await file.exists())) return;
    const proof = (await file.json()) as {
      type?: string;
      subsystem?: string;
      mcpCatalog?: { ok?: boolean; serverCount?: number };
      summary?: { staticOk?: boolean };
    };
    expect(proof.type).toBe('CloudflareTokenScopeProof');
    expect(proof.subsystem).toBe('other');
    expect(proof.mcpCatalog?.ok).toBe(true);
    expect(proof.mcpCatalog?.serverCount).toBe(4);
    expect(proof.summary?.staticOk).toBe(true);
  });

  test('cloudflare-pages-preflight.json is a valid preflight report', async () => {
    const file = Bun.file(joinPath(ROOT, 'public/registry/cloudflare-pages-preflight.json'));
    if (!(await file.exists())) return;
    const proof = (await file.json()) as {
      type?: string;
      ok?: boolean;
      steps?: Array<{ id?: string; ok?: boolean }>; // brand-ok — preflight step key in wire DTO
    };
    expect(proof.type).toBe('CloudflarePagesPreflightReport');
    expect(proof.steps?.length).toBeGreaterThanOrEqual(5);
    if (proof.ok) expect(proof.steps?.every(s => s.ok)).toBe(true);
  });

  test('well-known/mcp.json lists four Cloudflare MCP servers', async () => {
    const file = Bun.file(joinPath(ROOT, 'public/.well-known/mcp.json'));
    expect(await file.exists()).toBe(true);
    const manifest = (await file.json()) as {
      servers?: Array<{ name: string; url: string }>;
      auth?: { env?: string };
    };
    expect(manifest.servers?.length).toBe(4);
    expect(manifest.auth?.env).toBe('CLOUDFLARE_API_TOKEN');
  });
});
