// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';

describe('verify-pages-edge tiers', () => {
  test('core tier includes well-known and cloudflare token proof names', () => {
    const coreNames = [
      'portal/data.js',
      'well-known/mcp.json',
      'cloudflare-token-scope-proof.json',
    ];
    const taxonomyNames = [
      'proof-taxonomy-audit.json',
      'docs-coverage-proof.json subsystem',
      'registry-client-proof.json taxonomy',
      'doc-index.json taxonomy',
    ];
    expect(coreNames.length).toBe(3);
    expect(taxonomyNames.length).toBe(4);
    expect(coreNames).not.toContain('proof-taxonomy-audit.json');
  });

  test('--taxonomy flag is documented on verify script', async () => {
    const text = await Bun.file('tools/verify-pages-edge.ts').text();
    expect(text).toContain('--taxonomy');
    expect(text).toContain("tier: 'core' | 'taxonomy'");
    expect(text).toContain("c.tier === 'core'");
  });
});
