/**
 * Every critical proof path must name a fresh-rerun command.
 * @see docs/harness/FRESH-RERUN.md
 * @see docs/harness/PROOF.md — ProofPath catalog completeness
 * @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
 */
import { describe, expect, test } from 'bun:test';
import { CI_RUNBOOKS } from '../lib/harness/ci-deploy';
import { CODE_QUALITY_TENANTS } from '../lib/harness/code-quality';
import { CRITICAL_PROOF_PATHS } from '../lib/harness/proof';
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

  test('Owner→gate section lists every proof id with matching gateClass', async () => {
    const proofMd = await Bun.file(
      new URL('../docs/harness/PROOF.md', import.meta.url).pathname
    ).text();
    const start = proofMd.indexOf('## Owner → gate');
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

  test('every ProofPath declares a gateClass', () => {
    for (const p of CRITICAL_PROOF_PATHS) {
      expect(['continuous', 'workflow', 'human-only']).toContain(p.gateClass);
    }
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

  test('CI/deploy child claims share docs:ci-deploy freshRerun', () => {
    const ids = [
      'ci-core-envelope',
      'typescript-ci-gate',
      'deploy-production-preflight',
      'deploy-staging-script',
      'bun-migrate-status',
    ] as const;
    for (const id of ids) {
      const p = CRITICAL_PROOF_PATHS.find(x => x.id === id);
      expect(p?.freshRerun, id).toBe('bun run docs:ci-deploy');
    }
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

  test('path-bun claim covers lib and tools', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'path-bun');
    expect(p?.claim).toContain('tools/');
    expect(p?.freshRerun).toBe('bun run check:path-bun');
  });
});

describe('typecheck coherence includes', () => {
  test('tsconfig.check.json includes lib/docs, utils, core, and security globs', async () => {
    const cfg = (await Bun.file(
      new URL('../tsconfig.check.json', import.meta.url).pathname
    ).json()) as { include: string[] };
    expect(cfg.include).toContain('lib/docs/**/*');
    expect(cfg.include).toContain('lib/utils/**/*');
    expect(cfg.include).toContain('lib/core/**/*');
    expect(cfg.include).toContain('lib/security/**/*');
    expect(cfg.include.some(p => p.startsWith('lib/docs/') && p !== 'lib/docs/**/*')).toBe(
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
