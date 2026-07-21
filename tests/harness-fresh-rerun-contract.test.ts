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
});
