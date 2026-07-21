/**
 * Every critical proof path must name a fresh-rerun command.
 * @see docs/harness/FRESH-RERUN.md
 */
import { describe, expect, test } from 'bun:test';
import { CRITICAL_PROOF_PATHS } from '../lib/harness/proof';

describe('fresh-rerun contract', () => {
  test('every CRITICAL_PROOF_PATHS entry has a non-empty freshRerun', () => {
    expect(CRITICAL_PROOF_PATHS.length).toBeGreaterThan(0);
    for (const p of CRITICAL_PROOF_PATHS) {
      expect(p.freshRerun.trim().length, p.id).toBeGreaterThan(0);
      expect(p.freshRerun.includes('bun') || p.freshRerun.startsWith('bun '), p.id).toBe(true);
    }
  });

  test('install-verify-journey freshRerun is the WebView journey test', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'install-verify-journey');
    expect(p?.freshRerun).toBe('bun run test:install-verify');
  });

  test('search-governance-basic freshRerun is the WebView journey test', () => {
    const p = CRITICAL_PROOF_PATHS.find(x => x.id === 'search-governance-basic');
    expect(p?.freshRerun).toBe('bun run test:search-governance');
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
