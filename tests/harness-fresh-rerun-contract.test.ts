/**
 * Every critical proof path must name a fresh-rerun command.
 * @see docs/harness/FRESH-RERUN.md
 * @see docs/harness/PROOF.md — ProofPath catalog completeness
 * @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
 */
import { describe, expect, test } from 'bun:test';
import {
  assertCiChildProofBijection,
  assertCiDeployParentChildIds,
  assertCiInterventionNotCatalogFreshRerun,
  CI_CATALOG_FRESH_RERUN,
  CI_RUNBOOKS,
} from '../lib/harness/ci-deploy';
import {
  assertCodeQualityParentChildIds,
  assertCodeQualityProofClosedSet,
  CODE_QUALITY_TENANTS,
} from '../lib/harness/code-quality';
import { assertGateRefs } from '../lib/harness/gate-ref';
import { assertSpineParentChildIds } from '../lib/harness/maintenance';
import {
  assertProofOwnersAndChildren,
  CRITICAL_PROOF_PATHS,
  orderProofKinds,
} from '../lib/harness/proof';
import { joinPath } from '../lib/path-bun';

const HARNESS_ROOT = joinPath(import.meta.dir, '..');

describe('fresh-rerun contract', () => {
  test('every CRITICAL_PROOF_PATHS entry has a non-empty freshRerun', () => {
    expect(CRITICAL_PROOF_PATHS.length).toBeGreaterThan(0);
    for (const p of CRITICAL_PROOF_PATHS) {
      expect(p.freshRerun.trim().length, p.id).toBeGreaterThan(0);
      expect(p.freshRerun.includes('bun') || p.freshRerun.startsWith('bun '), p.id).toBe(true);
    }
  });

  test('catalog completeness: every proof id is documented', async () => {
    const proofMd = await Bun.file(
      new URL('../docs/harness/PROOF.md', import.meta.url).pathname
    ).text();
    // Escape hatch for pointer-grouped ids that are intentionally not listed by name.
    const pointerGrouped = new Set<string>([
      // empty until a group omits id names from PROOF.md
    ]);
    for (const p of CRITICAL_PROOF_PATHS) {
      const ok = proofMd.includes(`\`${p.id}\``) || pointerGrouped.has(p.id);
      expect(ok, p.id).toBe(true);
    }
  });

  test('Gate class section lists every proof id with matching gateClass', async () => {
    const proofMd = await Bun.file(
      new URL('../docs/harness/PROOF.md', import.meta.url).pathname
    ).text();
    const start = proofMd.indexOf('## Gate class');
    expect(start).toBeGreaterThanOrEqual(0);
    const end = proofMd.indexOf('\n## ', start + 1);
    const section = end >= 0 ? proofMd.slice(start, end) : proofMd.slice(start);
    const tallies = { continuous: 0, workflow: 0, 'human-only': 0 };
    for (const p of CRITICAL_PROOF_PATHS) {
      tallies[p.gateClass]++;
      const row = new RegExp(
        `\\|\\s*\`${p.id.replace(/-/g, '\\-')}\`\\s*\\|\\s*${p.gateClass}\\s*\\|`
      );
      expect(row.test(section), `${p.id} → ${p.gateClass}`).toBe(true);
    }
    expect(section).toContain(
      `continuous ${tallies.continuous} · workflow ${tallies.workflow} · human-only ${tallies['human-only']}`
    );
  });

  test('every ProofPath declares gateClass, gateRef, freshRerunKind, owner', () => {
    for (const p of CRITICAL_PROOF_PATHS) {
      expect(['continuous', 'workflow', 'human-only']).toContain(p.gateClass);
      expect(['claim', 'catalog']).toContain(p.freshRerunKind);
      expect(p.gateRef.trim().length, p.id).toBeGreaterThan(0);
      expect(p.owner.trim().length, p.id).toBeGreaterThan(0);
    }
    expect(assertProofOwnersAndChildren()).toEqual([]);
  });

  test('parent childIds closed sets match dual catalogs', () => {
    expect(assertCiDeployParentChildIds()).toEqual([]);
    expect(assertCodeQualityParentChildIds()).toEqual([]);
    expect(assertSpineParentChildIds()).toEqual([]);
  });

  test('freshRerunKind catalog iff docs:ci-deploy', () => {
    for (const p of CRITICAL_PROOF_PATHS) {
      const isCatalogCmd = p.freshRerun === CI_CATALOG_FRESH_RERUN;
      expect(p.freshRerunKind === 'catalog', p.id).toBe(isCatalogCmd);
    }
  });

  test('gateRef matches gateClass wiring rules', async () => {
    expect(await assertGateRefs(CRITICAL_PROOF_PATHS, HARNESS_ROOT)).toEqual([]);
  });

  test('kinds arrays use stable unit→boundary→journey→deployed order', () => {
    for (const p of CRITICAL_PROOF_PATHS) {
      expect(p.kinds, p.id).toEqual(orderProofKinds(p.kinds));
    }
  });

  test('CI child bijection + intervention ≠ catalog paste', () => {
    expect(assertCiChildProofBijection()).toEqual([]);
    expect(assertCiInterventionNotCatalogFreshRerun()).toEqual([]);
  });

  test('CODE_QUALITY proof closed set (types-covered → lib-docs only)', () => {
    expect(assertCodeQualityProofClosedSet()).toEqual([]);
  });

  test('evidence parity: every claim evidence includes freshRerun', () => {
    for (const p of CRITICAL_PROOF_PATHS) {
      expect(p.evidence.includes(p.freshRerun), p.id).toBe(true);
    }
  });

  test('dead catalog: CI_SPINE_SMOKE substring absent from harness sources', async () => {
    // Prefix match (not only …_TESTS) — catches comments, stale docs, partial refs.
    const needle = 'CI_SPINE_SMOKE';
    const scans: Array<{ cwd: string; pattern: string }> = [
      { cwd: joinPath(HARNESS_ROOT, 'lib/harness'), pattern: '**/*.ts' },
      { cwd: joinPath(HARNESS_ROOT, 'docs/harness'), pattern: '**/*.md' },
    ];
    for (const { cwd, pattern } of scans) {
      for await (const rel of new Bun.Glob(pattern).scan({ cwd })) {
        const abs = joinPath(cwd, rel);
        const text = await Bun.file(abs).text();
        expect(text.includes(needle), abs).toBe(false);
      }
    }
  });

  test('CI_RUNBOOKS freshRerun matches linked ProofPath', () => {
    for (const r of CI_RUNBOOKS) {
      const p = CRITICAL_PROOF_PATHS.find(x => x.id === r.proofId);
      expect(p, r.id).toBeDefined();
      expect(p!.freshRerun, r.id).toBe(r.freshRerun);
    }
  });

  test('CODE_QUALITY_TENANTS freshRerun matches linked ProofPath', () => {
    for (const t of CODE_QUALITY_TENANTS) {
      const p = CRITICAL_PROOF_PATHS.find(x => x.id === t.proofId);
      expect(p, t.id).toBeDefined();
      expect(p!.freshRerun, t.id).toBe(t.freshRerun);
    }
  });

  test('runtime-cli-boundaries freshRerun is the fixture suite', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'runtime-cli-boundaries');
    expect(p?.freshRerun).toBe('bun test tests/fixtures/runtime-cli/');
  });

  test('bun-shell-boundaries freshRerun runs green', async () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'bun-shell-boundaries');
    expect(p?.freshRerun).toBe('bun test tests/fixtures/bun-shell/');
    const result = Bun.spawnSync(['bun', 'test', 'tests/fixtures/bun-shell/'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(result.exitCode).toBe(0);
  });

  test('fs-native-boundaries freshRerun runs green', async () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'fs-native-boundaries');
    expect(p?.freshRerun).toBe('bun test tests/fs-bun.test.ts tests/bun-glob-scan.test.ts');
    const result = Bun.spawnSync(
      ['bun', 'test', 'tests/fs-bun.test.ts', 'tests/bun-glob-scan.test.ts'],
      { stdout: 'pipe', stderr: 'pipe' }
    );
    expect(result.exitCode).toBe(0);
  });

  test('security-hash-boundaries freshRerun runs green', async () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'security-hash-boundaries');
    expect(p?.freshRerun).toBe('bun test tests/fixtures/security-hash/');
    const result = Bun.spawnSync(['bun', 'test', 'tests/fixtures/security-hash/'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(result.exitCode).toBe(0);
  });

  test('url-pattern-boundaries freshRerun runs green', async () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'url-pattern-boundaries');
    expect(p?.freshRerun).toBe('bun test tests/bun-site-url.test.ts');
    const result = Bun.spawnSync(['bun', 'test', 'tests/bun-site-url.test.ts'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(result.exitCode).toBe(0);
  });

  test('social-metadata-boundaries freshRerun runs green', async () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'social-metadata-boundaries');
    expect(p?.freshRerun).toBe('bun test tests/fixtures/social-metadata/');
    const result = Bun.spawnSync(['bun', 'test', 'tests/fixtures/social-metadata/'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(result.exitCode).toBe(0);
  });

  test('blog-extraction-boundaries freshRerun runs green', async () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'blog-extraction-boundaries');
    expect(p?.freshRerun).toBe('bun test tests/fixtures/blog-extraction/');
    const result = Bun.spawnSync(['bun', 'test', 'tests/fixtures/blog-extraction/'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(result.exitCode).toBe(0);
  });

  test('fetch-page-boundaries freshRerun runs green', async () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'fetch-page-boundaries');
    expect(p?.freshRerun).toBe('bun test tests/fixtures/fetch-page/');
    const result = Bun.spawnSync(['bun', 'test', 'tests/fixtures/fetch-page/'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(result.exitCode).toBe(0);
  });

  test('blog-extraction-journey freshRerun is the live ingestion test', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'blog-extraction-journey');
    expect(p?.freshRerun).toBe('bun test tests/journey/blog-extraction.test.ts');
    expect(p?.gateClass).toBe('human-only');
    expect(p?.kinds).toContain('journey');
  });

  test('install-verify-journey freshRerun is the WebView journey test', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'install-verify-journey');
    expect(p?.freshRerun).toBe('bun run test:install-verify');
  });

  test('search-governance evidence includes bench gate; freshRerun matches', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'search-governance');
    expect(p?.freshRerun).toBe('bun run search:bench:gate');
    expect(p?.evidence).toContain('bun run search:bench:gate');
    expect(p?.claim).not.toMatch(/\bin CI\b/i);
  });

  test('search-governance-basic freshRerun is the WebView journey test', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'search-governance-basic');
    expect(p?.freshRerun).toBe('bun run test:search-governance');
  });

  test('CI/deploy catalog children use freshRerunKind catalog', () => {
    for (const p of CRITICAL_PROOF_PATHS.filter(x => x.freshRerunKind === 'catalog')) {
      expect(p.freshRerun, p.id).toBe(CI_CATALOG_FRESH_RERUN);
    }
    expect(CRITICAL_PROOF_PATHS.filter(x => x.freshRerunKind === 'catalog')).toHaveLength(5);
  });

  test('branded-ids freshRerun is check:brands:types', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'branded-ids');
    expect(p?.freshRerun).toBe('bun run check:brands:types');
  });

  test('cloudflare-pages-env-ssot freshRerun is r2-env unit suite', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'cloudflare-pages-env-ssot');
    expect(p?.freshRerun).toBe('bun test tests/r2-env.test.ts');
    expect(p?.gateClass).toBe('human-only');
    expect(p?.owner).toBe('config/r2-env.ts');
    expect(p?.evidence).toContain('docs/harness/tenants/cloudflare-pages.md');
  });

  test('channel-meta-verification-v1 freshRerun is verification suite cluster', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'channel-meta-verification-v1');
    expect(p?.gateClass).toBe('continuous');
    expect(p?.gateRef).toBe('ci:harness');
    expect(p?.owner).toBe('lib/verification/');
    expect(p?.kinds).toEqual(['unit', 'boundary']);
    expect(p?.freshRerun).toBe(
      'bun test tests/channel-suite.test.ts tests/verification-subsystem.test.ts tests/bundler-loader-probes.test.ts tests/networking-channel.test.ts tests/verification-proof-taxonomy.test.ts tests/channel-meta-refresh.test.ts tests/verification-proof-consistency.test.ts'
    );
    expect(p?.evidence).toContain(p!.freshRerun);
    expect(p?.evidence).toContain('docs/harness/tenants/channel-meta-verification.md');
    expect(p?.evidence).toContain('lib/verification/channel-meta-refresh.ts');
    expect(p?.evidence).toContain('lib/verification/proof-consistency.ts');
  });

  test('console-depth-boundaries freshRerun is console-depth suite', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'console-depth-boundaries');
    expect(p?.freshRerun).toBe('bun test tests/console-depth.test.ts');
    expect(p?.gateClass).toBe('human-only');
    expect(p?.owner).toBe('lib/console-depth.ts');
  });

  test('github-repository-ref-boundaries freshRerun is github-repository-ref suite', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'github-repository-ref-boundaries');
    expect(p?.freshRerun).toBe('bun test tests/github-repository-ref.test.ts');
    expect(p?.gateClass).toBe('human-only');
    expect(p?.owner).toBe('lib/github-repository-ref.ts');
  });

  test('macros-embed-boundaries freshRerun is macros embed-commit suite', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'macros-embed-boundaries');
    expect(p?.freshRerun).toBe('bun test tests/macros/embed-commit.test.ts');
    expect(p?.gateClass).toBe('human-only');
    expect(p?.owner).toBe('lib/macros/');
  });

  test('install-verify freshRerun is proof:install', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'install-verify');
    expect(p?.freshRerun).toBe('bun run proof:install');
  });

  test('test-changed freshRerun is test:changed:main', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'test-changed');
    expect(p?.freshRerun).toBe('bun run test:changed:main');
  });

  test('bun-env freshRerun is check:bun-env', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'bun-env');
    expect(p?.freshRerun).toBe('bun run check:bun-env');
  });

  test('unknown-param freshRerun is bun-native eslint quiet', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'unknown-param');
    expect(p?.freshRerun).toBe('bun eslint --config eslint.harness.config.ts --quiet');
  });

  test('day-loop-typecheck freshRerun is day-loop type-check', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'day-loop-typecheck');
    expect(p?.freshRerun).toBe('bun run type-check');
  });

  test('bun-cron freshRerun is test:cron', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'bun-cron');
    expect(p?.freshRerun).toBe('bun run test:cron');
  });

  test('harness-orphan-modules freshRerun is check:harness-orphans', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'harness-orphan-modules');
    expect(p?.freshRerun).toBe('bun run check:harness-orphans');
  });

  test('cron-os-persistent freshRerun is the OS cron journey test', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'cron-os-persistent');
    expect(p?.freshRerun).toBe('bun run test:cron-os');
  });

  test('lib-docs-typecheck freshRerun is day-loop type-check', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'lib-docs-typecheck');
    expect(p?.freshRerun).toBe('bun run type-check');
  });

  test('lib-utils-typecheck freshRerun is day-loop type-check', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'lib-utils-typecheck');
    expect(p?.freshRerun).toBe('bun run type-check');
  });

  test('lib-core-typecheck freshRerun is day-loop type-check', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'lib-core-typecheck');
    expect(p?.freshRerun).toBe('bun run type-check');
  });

  test('lib-security-typecheck freshRerun is day-loop type-check', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'lib-security-typecheck');
    expect(p?.freshRerun).toBe('bun run type-check');
  });

  test('spine-multi-tenant freshRerun is install-verify tenant once', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'spine-multi-tenant');
    expect(p?.freshRerun).toBe('bun run spine:schedule:once -- --tenant=install-verify');
  });

  test('spine-maintenance-runbooks freshRerun is test:tenant-runbooks', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'spine-maintenance-runbooks');
    expect(p?.freshRerun).toBe('bun run test:tenant-runbooks');
  });

  test('spine-tenant-heal freshRerun is test:tenant-heal', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'spine-tenant-heal');
    expect(p?.freshRerun).toBe('bun run test:tenant-heal');
  });

  test('harness-coverage-ratchet freshRerun is test:harness-coverage', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'harness-coverage-ratchet');
    expect(p?.freshRerun).toBe('bun run test:harness-coverage');
  });

  test('harness-complexity-floor freshRerun is check:harness-complexity', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'harness-complexity-floor');
    expect(p?.freshRerun).toBe('bun run check:harness-complexity');
  });

  test('code-quality-tenants freshRerun is test:code-quality', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'code-quality-tenants');
    expect(p?.freshRerun).toBe('bun run test:code-quality');
  });

  test('ci-deploy-runbooks freshRerun is test:ci-deploy', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'ci-deploy-runbooks');
    expect(p?.freshRerun).toBe('bun run test:ci-deploy');
  });

  test('docs-integrity freshRerun is bun-doc-refs schedule --once', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'docs-integrity');
    expect(p?.freshRerun).toBe('bun tools/bun-doc-refs.ts schedule --once');
  });

  test('audit-findings-catalog freshRerun is audit:verify (continuous)', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'audit-findings-catalog');
    expect(p?.freshRerun).toBe('bun run audit:verify');
    expect(p?.gateClass).toBe('continuous');
    expect(p?.gateRef).toBe('ci:harness');
    expect(p?.evidence.some(e => e.includes('docs/audit'))).toBe(true);
  });

  test('path-bun claim covers lib and tools', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'path-bun');
    expect(p?.claim).toContain('tools/');
    expect(p?.freshRerun).toBe('bun run check:path-bun');
  });

  test('factory-registry-cli-v1 freshRerun is registry+cli suites', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'factory-registry-cli-v1');
    expect(p?.freshRerun).toBe('bun test tests/registry.test.ts tests/cli.test.ts');
    expect(p?.gateClass).toBe('human-only');
    expect(p?.owner).toBe('lib/factory/');
    expect(p?.kinds).toEqual(expect.arrayContaining(['unit', 'boundary']));
  });

  test('factory-registry-pages-proxy-v1 freshRerun is pages-function suite', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'factory-registry-pages-proxy-v1');
    expect(p?.freshRerun).toBe('bun test tests/registry-pages-function.test.ts');
    expect(p?.gateClass).toBe('human-only');
    expect(p?.owner).toBe('functions/api/registry/[[path]].ts');
    expect(p?.evidence).toContain('functions/api/registry/[[path]].ts');
    expect(p?.evidence).toContain('public/portal/app.js');
  });
});

describe('typecheck coherence includes', () => {
  test('tsconfig.check.json includes lib/docs, audit, utils, core, and security globs', async () => {
    const cfg = (await Bun.file(
      new URL('../tsconfig.check.json', import.meta.url).pathname
    ).json()) as { include: string[] };
    expect(cfg.include).toContain('lib/docs/**/*');
    expect(cfg.include).toContain('lib/audit/**/*');
    expect(cfg.include).toContain('lib/utils/**/*');
    expect(cfg.include).toContain('lib/core/**/*');
    expect(cfg.include).toContain('lib/security/**/*');
    expect(cfg.include.some(p => p.startsWith('lib/docs/') && p !== 'lib/docs/**/*')).toBe(
      false
    );
    expect(cfg.include.some(p => p.startsWith('lib/audit/') && p !== 'lib/audit/**/*')).toBe(
      false
    );
    expect(cfg.include.some(p => p.startsWith('lib/utils/') && p !== 'lib/utils/**/*')).toBe(
      false
    );
    expect(cfg.include.some(p => p.startsWith('lib/core/') && p !== 'lib/core/**/*')).toBe(
      false
    );
    expect(
      cfg.include.some(p => p.startsWith('lib/security/') && p !== 'lib/security/**/*')
    ).toBe(false);
    expect(cfg.include).not.toContain('src/**/*');
    expect(cfg.include).not.toContain('lib/udp/**/*');
    expect(cfg.include).not.toContain('lib/env/**/*');
    expect(cfg.include).not.toContain('types/**/*');
  });
});
