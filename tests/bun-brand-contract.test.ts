import { describe, expect, test } from 'bun:test';
import {
  validateBunBrandUsages,
  type BunBrandCatalogToken,
  type BunBrandUsageDeclaration,
} from '../lib/docs/bun-brand-contract.ts';
import { asDocTokenId } from '../lib/types/branded/documents.ts';

const catalog = new Map<string, BunBrandCatalogToken>([
  [
    'Bun.WebView',
    {
      name: 'Bun.WebView',
      type: 'api',
      stability: 'experimental',
      releasedIn: '1.3.12',
    },
  ],
]);

function declaration(
  overrides: Partial<BunBrandUsageDeclaration> = {}
): BunBrandUsageDeclaration {
  return {
    key: 'webview-evidence',
    token: asDocTokenId('Bun.WebView'),
    variant: 'headless',
    scope: 'production',
    policy: 'lab-only',
    ownerLane: 'audit',
    implementations: [{ path: 'lib/example.ts', symbol: 'render' }],
    consumers: [],
    relationships: [
      {
        direction: 'evidence',
        brand: 'EvidenceId',
        rationale: 'The render is stored as evidence.',
      },
    ],
    proofs: [],
    ...overrides,
  };
}

const context = {
  catalogTokens: catalog,
  brandNames: new Set(['EvidenceId']),
  ownerLanes: new Set(['audit', 'runtime-tooling']),
  trackedPaths: new Set(['lib/example.ts']),
  today: '2026-07-28',
};

describe('Bun brand declaration contract', () => {
  test('accepts a known token, brand, owner, and tracked implementation', () => {
    expect(validateBunBrandUsages([declaration()], context)).toEqual([]);
  });

  test('rejects unknown tokens, brands, owners, and paths', () => {
    const issues = validateBunBrandUsages(
      [
        declaration({
          token: asDocTokenId('Bun.Unknown'),
          ownerLane: 'unknown',
          implementations: [{ path: 'missing.ts', symbol: 'render' }],
          relationships: [
            { direction: 'output', brand: 'UnknownId', rationale: 'test relationship' },
          ],
        }),
      ],
      context
    );
    expect(issues.map(row => row.field)).toEqual(
      expect.arrayContaining(['token', 'ownerLane', 'path', 'relationships'])
    );
  });

  test('requires none to be exclusive and explained', () => {
    const issues = validateBunBrandUsages(
      [
        declaration({
          relationships: [
            { direction: 'none', brand: null, rationale: '' },
            { direction: 'evidence', brand: 'EvidenceId', rationale: 'mixed' },
          ],
        }),
      ],
      context
    );
    expect(issues.filter(row => row.field === 'relationships')).toHaveLength(2);
  });

  test('rejects invalid runtime scope, policy, and relationship direction values', () => {
    const issues = validateBunBrandUsages(
      [
        declaration({
          scope: 'invalid' as BunBrandUsageDeclaration['scope'],
          policy: 'invalid' as BunBrandUsageDeclaration['policy'],
          relationships: [
            {
              direction: 'invalid',
              brand: 'EvidenceId',
              rationale: 'invalid fixture',
            } as unknown as BunBrandUsageDeclaration['relationships'][number],
          ],
        }),
      ],
      context
    );
    expect(issues.map(row => row.field)).toEqual(
      expect.arrayContaining(['scope', 'policy', 'relationships'])
    );
  });

  test('requires complete, unexpired approval for experimental production use', () => {
    const missing = validateBunBrandUsages(
      [declaration({ policy: 'production-approved' })],
      context
    );
    expect(missing.some(row => row.field === 'experimentalApproval')).toBe(true);

    const expired = validateBunBrandUsages(
      [
        declaration({
          policy: 'production-approved',
          experimentalApproval: {
            owner: 'audit',
            rationale: 'Expired fixture',
            fallback: 'No-op',
            expiresOn: '2026-01-01',
          },
        }),
      ],
      context
    );
    expect(expired.some(row => row.field === 'experimentalApproval')).toBe(true);

    const approved = validateBunBrandUsages(
      [
        declaration({
          policy: 'production-approved',
          experimentalApproval: {
            owner: 'audit',
            rationale: 'Bounded evidence rendering',
            fallback: 'Store the unwatermarked image',
            expiresOn: '2026-12-31',
          },
        }),
      ],
      context
    );
    expect(approved).toEqual([]);
  });
});
