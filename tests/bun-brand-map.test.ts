import { describe, expect, test } from 'bun:test';
import { asDocTokenId } from '../lib/types/branded/documents.ts';
import { parseBunBrandBaseline } from '../scripts/check-bun-brand-baseline.ts';
import {
  buildBunBrandMap,
  loadBunBrandMapInput,
  mapWithConcurrency,
  observationKey,
  observeBunCapabilities,
  parseBrandKeymap,
  parseBrandManifest,
  parseBunBrandUsageBaseline,
  parseBunDocsCatalog,
  parseReleaseProof,
} from '../tools/bun-brand-map.ts';

describe('Bun capability observation', () => {
  test('accepts a v1 baseline only as the historical ratchet input', () => {
    const legacy = JSON.stringify({
      schemaVersion: 1,
      kind: 'bun-brand-usage-baseline',
      keys: ['legacy-key'],
    });
    const current = JSON.stringify({
      schemaVersion: 2,
      kind: 'bun-brand-usage-baseline',
      keys: ['legacy-key'],
    });

    expect(parseBunBrandBaseline(legacy, 'HEAD:baseline.json', true).schemaVersion).toBe(1);
    expect(() => parseBunBrandBaseline(legacy, 'baseline.json')).toThrow(
      'invalid Bun brand baseline'
    );
    expect(parseBunBrandBaseline(current, 'baseline.json').schemaVersion).toBe(2);
  });

  test('uses AST calls, aliases, variants, and ignores comments, strings, and type-only imports', () => {
    const rows = observeBunCapabilities([
      {
        path: 'lib/sample.ts',
        content: `
          import type { Image } from "bun";
          import { cron as schedule } from "bun";
          // new Bun.Image(commentOnly)
          const snippet = "new Bun.WebView({ headless: true })";
          new Bun.Image(bytes);
          schedule("* * * * *", () => {});
          fetch(url, { protocol: "http2" });
          Bun.serve({ http3: true, fetch: () => new Response("ok") });
        `,
      },
    ]);

    expect(rows.map(row => [row.token, row.variant])).toEqual([
      ['Bun.cron', 'in-process'],
      ['Bun.Image', 'image-processing'],
      ['Bun.serve http3', 'quic-server'],
      ['fetch protocol http2', 'fetch-client'],
    ]);
    expect(rows.map(row => row.symbol)).toEqual([null, null, null, null]);
    expect(rows.some(row => row.token === 'Bun.WebView')).toBe(false);
  });

  test('captures function and class-method ownership for exact declaration matching', () => {
    const rows = observeBunCapabilities([
      {
        path: 'lib/owned.ts',
        content: `
          function resize() { return new Bun.Image(bytes); }
          class Renderer {
            render() { return new Bun.Image(bytes); }
          }
        `,
      },
    ]);
    expect(rows.map(row => row.symbol)).toEqual(['resize', 'Renderer.render']);
  });

  test('distinguishes bun test flags from bun run flags', () => {
    const rows = observeBunCapabilities([
      {
        path: 'package.json',
        content: JSON.stringify({
          scripts: {
            'test:parallel': 'bun test --parallel --shard=1/2 --changed',
            'test:isolate': 'bun test --isolate',
            run: 'bun run --parallel lint test',
          },
        }),
      },
    ]);
    expect(rows.map(row => `${row.token}:${row.variant}`)).toEqual([
      '--changed:bun-test',
      '--isolate:bun-test',
      '--parallel:bun-run',
      '--parallel:bun-test',
      '--shard:bun-test',
    ]);
  });

  test('classifies Bun.cron overloads with contextual variants', () => {
    const rows = observeBunCapabilities([
      {
        path: 'lib/cron.ts',
        content: `
          Bun.cron("* * * * *", () => {});
          Bun.cron(scriptPath, schedule, title);
          Bun.cron.parse("* * * * *");
        `,
      },
    ]);
    expect(rows.map(row => row.variant)).toEqual(['in-process', 'os-persistent', 'parse']);
  });

  test('finding keys remain stable when only source line numbers move', () => {
    const first = observeBunCapabilities([
      { path: 'lib/a.ts', content: 'new Bun.Image(bytes);' },
    ])[0]!;
    const shifted = observeBunCapabilities([
      { path: 'lib/a.ts', content: '\n\nnew Bun.Image(bytes);' },
    ])[0]!;
    expect(first.line).not.toBe(shifted.line);
    expect(observationKey(first)).toBe(observationKey(shifted));
  });
});

describe('Bun brand map join', () => {
  test('joins exact proof state and preserves the catalog version', () => {
    const declaration = {
      key: 'image',
      token: asDocTokenId('Bun.Image'),
      variant: 'image-processing',
      scope: 'production' as const,
      policy: 'production-approved' as const,
      ownerLane: 'audit',
      implementations: [{ path: 'lib/image.ts', symbol: 'render' }],
      consumers: [],
      relationships: [
        {
          direction: 'evidence' as const,
          brand: 'EvidenceId',
          rationale: 'Image output is evidence.',
        },
      ],
      proofs: [
        {
          source: 'proof.json',
          key: 'result:terminal-methods',
          maxAgeDays: 45,
        },
      ],
    };
    const payload = buildBunBrandMap({
      declarations: [declaration],
      catalog: {
        generated: '2026-07-28T00:00:00Z',
        entries: [
          {
            name: 'Bun.Image',
            type: 'api',
            stability: 'stable',
            releasedIn: '1.3.14',
            docsUrl: 'https://bun.com/docs/runtime/image',
          },
        ],
      },
      manifest: {
        brandCount: 47,
        domains: ['audit'],
        brands: [{ name: 'EvidenceId', domain: 'audit' }],
      },
      brandKeymap: {
        projects: [
          { project: 'projects/active/example', status: 'governed-no-usage' },
          { project: 'projects/external/example', status: 'external-or-untracked' },
        ],
      },
      trackedPaths: new Set(['lib/image.ts']),
      observations: [
        {
          token: 'Bun.Image',
          variant: 'image-processing',
          path: 'lib/image.ts',
          symbol: 'render',
          line: 1,
          occurrence: 1,
          project: 'project-R-score',
          syntax: 'ast-new',
        },
      ],
      baseline: new Set(),
      releases: new Map([
        [
          'proof.json',
          {
            timestamp: '2026-07-28T00:00:00Z',
            results: [
              {
                canonicalKey: 'terminal-methods',
                passed: true,
                introducedIn: '1.3.14',
              },
            ],
          },
        ],
      ]),
      generatedAt: '2026-07-28T12:00:00Z',
    });

    expect(payload.capabilities[0]?.versionIntroduced).toBe('1.3.14');
    expect(payload.capabilities[0]?.evidenceState).toBe('verified');
    expect(payload.summary.catalogConflicts).toBe(0);
    expect(payload.summary.totalCanonicalBrands).toBe(47);
    expect(payload.summary.trackedProjects).toBe(1);
    expect(payload.summary.externalProjects).toBe(1);
  });

  test('does not match an unrelated symbol or renumber its baseline after a declared use', () => {
    const declaration = {
      key: 'image',
      token: asDocTokenId('Bun.Image'),
      variant: 'image-processing',
      scope: 'production' as const,
      policy: 'optional' as const,
      ownerLane: 'audit',
      implementations: [{ path: 'lib/image.ts', symbol: 'render' }],
      consumers: [],
      relationships: [
        {
          direction: 'none' as const,
          brand: null,
          rationale: 'The native image stays unbranded in this wrapper.',
        },
      ],
      proofs: [],
    };
    const payload = buildBunBrandMap({
      declarations: [declaration],
      catalog: {
        generated: '2026-07-28T00:00:00Z',
        entries: [
          {
            name: 'Bun.Image',
            type: 'api',
            stability: 'stable',
            releasedIn: '1.3.14',
          },
        ],
      },
      manifest: { brandCount: 0, domains: ['audit'], brands: [] },
      brandKeymap: { projects: [] },
      trackedPaths: new Set(['lib/image.ts']),
      observations: [
        {
          token: 'Bun.Image',
          variant: 'image-processing',
          path: 'lib/image.ts',
          symbol: 'render',
          line: 1,
          occurrence: 1,
          project: 'project-R-score',
          syntax: 'ast-new',
        },
        {
          token: 'Bun.Image',
          variant: 'image-processing',
          path: 'lib/image.ts',
          symbol: 'unreviewed',
          line: 2,
          occurrence: 2,
          project: 'project-R-score',
          syntax: 'ast-new',
        },
      ],
      baseline: new Set(['Bun.Image|image-processing|lib/image.ts#1']),
      releases: new Map(),
      generatedAt: '2026-07-28T12:00:00Z',
    });

    expect(payload.summary.matched).toBe(1);
    expect(payload.summary.undeclared).toBe(1);
    expect(payload.findings).toContainEqual(
      expect.objectContaining({
        key: 'Bun.Image|image-processing|lib/image.ts#1',
        baseline: true,
      })
    );
  });

  test('failed proof outranks stale and missing proof regardless of declaration order', () => {
    const declaration = {
      key: 'image-proof-precedence',
      token: asDocTokenId('Bun.Image'),
      variant: 'image-processing',
      scope: 'tooling' as const,
      policy: 'optional' as const,
      ownerLane: 'audit',
      implementations: [{ path: 'lib/image.ts', symbol: 'render' }],
      consumers: [],
      relationships: [
        {
          direction: 'none' as const,
          brand: null,
          rationale: 'The native image remains unbranded.',
        },
      ],
      proofs: [
        { source: 'missing.json', key: 'result:missing' },
        { source: 'stale.json', key: 'result:stale', maxAgeDays: 1 },
        { source: 'failed.json', key: 'result:failed' },
      ],
    };
    const common = {
      catalog: {
        generated: '2026-07-28T00:00:00Z',
        entries: [
          {
            name: 'Bun.Image',
            type: 'api',
            stability: 'stable' as const,
            releasedIn: '1.3.14',
          },
        ],
      },
      manifest: { brandCount: 0, domains: ['audit'], brands: [] },
      brandKeymap: { projects: [] },
      trackedPaths: new Set(['lib/image.ts']),
      observations: [],
      baseline: new Set<string>(),
      releases: new Map([
        [
          'stale.json',
          {
            timestamp: '2026-01-01T00:00:00Z',
            results: [{ canonicalKey: 'stale', passed: true }],
          },
        ],
        [
          'failed.json',
          {
            timestamp: '2026-07-28T00:00:00Z',
            results: [{ canonicalKey: 'failed', passed: false }],
          },
        ],
      ]),
      generatedAt: '2026-07-28T12:00:00Z',
    };

    const forward = buildBunBrandMap({ ...common, declarations: [declaration] });
    const reverse = buildBunBrandMap({
      ...common,
      declarations: [{ ...declaration, proofs: [...declaration.proofs].reverse() }],
    });

    expect(forward.capabilities[0]?.evidenceState).toBe('failed');
    expect(reverse.capabilities[0]?.evidenceState).toBe('failed');
    expect(forward.summary.attention).toBe(1);
    expect(forward.findings.filter(row => row.kind === 'proof-state')).toHaveLength(1);
  });

  test('source validators reject malformed catalog, manifest, keymap, proof, and baseline data', () => {
    expect(() =>
      parseBunDocsCatalog({
        generated: '2026-07-28T00:00:00Z',
        entries: [{ name: 'Bun.Image', type: 'api', stability: 'preview' }],
      })
    ).toThrow('tools/bun-docs-catalog.json at entries[0].stability');
    expect(() =>
      parseBrandManifest({
        brandCount: 2,
        domains: ['audit'],
        brands: [{ name: 'EvidenceId', domain: 'audit' }],
      })
    ).toThrow('brandCount');
    expect(() =>
      parseBrandKeymap({
        projects: [{ project: 'projects/active/example', status: 1 }],
      })
    ).toThrow('projects[0].status');
    expect(() =>
      parseReleaseProof({
        timestamp: 'not-a-date',
        results: [],
      })
    ).toThrow('release-features.json at timestamp');
    expect(() =>
      parseBunBrandUsageBaseline({
        schemaVersion: 2,
        kind: 'bun-brand-usage-baseline',
        keys: ['duplicate', 'duplicate'],
      })
    ).toThrow('contains duplicates');
  });

  test('tracked source mapping preserves order while bounding concurrency', async () => {
    let active = 0;
    let maximum = 0;
    const values = Array.from({ length: 20 }, (_, index) => index);
    const mapped = await mapWithConcurrency(values, 3, async value => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise(resolve => setTimeout(resolve, 1));
      active -= 1;
      return value * 2;
    });

    expect(maximum).toBeLessThanOrEqual(3);
    expect(mapped).toEqual(values.map(value => value * 2));
  });

  test(
    'bake is deterministic apart from generatedAt',
    async () => {
      const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
      const input = await loadBunBrandMapInput(root);
      const first = buildBunBrandMap({
        ...input,
        generatedAt: '2026-07-28T12:00:00.000Z',
      });
      const second = buildBunBrandMap({
        ...input,
        generatedAt: '2026-07-28T12:00:01.000Z',
      });

      expect({ ...first, generatedAt: '' }).toEqual({ ...second, generatedAt: '' });
    },
    20_000
  );
});
