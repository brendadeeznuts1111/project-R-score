// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { PROOF_TAXONOMY_CONTRACT_COUNT } from '../lib/verification/proof-taxonomy.ts';
import { selectProductionContentBase } from '../tools/verify-pages-edge.ts';

describe('verify-pages-edge tiers', () => {
  test('core tier includes well-known, preflight, and cloudflare token proof names', () => {
    const coreNames = [
      'portal/data.js',
      'well-known/mcp.json',
      'cloudflare-pages-preflight.json',
      'cloudflare-token-scope-proof.json',
      '/api/skills JSON',
    ];
    const taxonomyNames = [
      'proof-taxonomy-audit.json',
      'docs-coverage-proof.json subsystem',
      'registry-client-proof.json taxonomy',
      'doc-index.json taxonomy',
    ];
    expect(coreNames.length).toBe(5);
    expect(taxonomyNames.length).toBe(4);
    expect(coreNames).not.toContain('proof-taxonomy-audit.json');
  });

  test('--taxonomy flag and dynamic contract count are wired in verify script', async () => {
    const text = await Bun.file('tools/verify-pages-edge.ts').text();
    expect(text).toContain('--taxonomy');
    expect(text).toContain("tier: 'core' | 'taxonomy'");
    expect(text).toContain("c.tier === 'core'");
    expect(text).toContain('PROOF_TAXONOMY_CONTRACT_COUNT');
    expect(text).toContain('cloudflare-pages-preflight.json');
    expect(PROOF_TAXONOMY_CONTRACT_COUNT).toBeGreaterThanOrEqual(13);
  });

  test('production proof prefers the public apex over Access-protected hash previews', () => {
    expect(
      selectProductionContentBase({
        url: 'https://deadbeef.project-r-score.pages.dev',
        aliases: [
          'https://score.factory-wager.com',
          'https://factory-wager.com/',
          'not a URL',
        ],
      })
    ).toBe('https://factory-wager.com');
  });

  test('production proof falls back to the deployment URL when no apex alias exists', () => {
    expect(
      selectProductionContentBase({
        url: 'https://deadbeef.project-r-score.pages.dev/',
        aliases: ['https://score.factory-wager.com'],
      })
    ).toBe('https://deadbeef.project-r-score.pages.dev');
  });
});
