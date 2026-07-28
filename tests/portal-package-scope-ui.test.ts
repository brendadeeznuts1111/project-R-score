// @see https://bun.com/docs/test/writing-tests
import { describe, expect, test } from 'bun:test';
import {
  applyFilters,
  collectScopes,
  derivePackageScope,
  parseHashState,
  serializeHashState,
} from '../public/portal/search.js';

type PackageEntry = [string, {
  'dist-tags': { latest: string };
  releases: Record<string, {
    description: string;
    type: string;
    tags: string[];
    publishedAt: string;
  }>;
}];

function packageEntry(
  name: string,
  type: string,
  tags: string[],
  publishedAt = '2026-07-28T00:00:00.000Z',
): PackageEntry {
  return [name, {
    'dist-tags': { latest: '1.0.0' },
    releases: {
      '1.0.0': {
        description: `${name} package`,
        type,
        tags,
        publishedAt,
      },
    },
  }];
}

const packages: PackageEntry[] = [
  packageEntry('@factory/health-check', 'service', ['health']),
  packageEntry('@factorywager/registry-client', 'library', ['registry']),
  packageEntry('@factorywager/bun-test', 'tool', ['test']),
  packageEntry('event-store', 'library', ['registry']),
];

describe('registry package scope state', () => {
  test('derives npm scopes and gives plain names an explicit unscoped lane', () => {
    expect(derivePackageScope('@factory/health-check')).toBe('@factory');
    expect(derivePackageScope('@factorywager/registry-client')).toBe('@factorywager');
    expect(derivePackageScope('event-store')).toBe('unscoped');
    expect(derivePackageScope('@invalid')).toBe('unscoped');
    expect(collectScopes(packages)).toEqual(['@factory', '@factorywager', 'unscoped']);
  });

  test('round-trips scope with existing query, type, tag, and sort state', () => {
    const state = {
      query: 'registry',
      types: ['library'],
      scopes: ['@factorywager', 'unscoped'],
      tags: ['registry'],
      sort: 'date',
      project: '@factorywager/registry-client',
    };
    const hash = serializeHashState(state);

    expect(hash).toContain('scope=%40factorywager%2Cunscoped');
    expect(parseHashState(hash)).toEqual(state);
    expect(parseHashState('')).toEqual({
      query: '',
      types: [],
      scopes: [],
      tags: [],
      sort: 'name',
      project: '',
    });
  });

  test('composes scope with query, type, tag, and sorting', () => {
    const filtered = applyFilters(packages, {
      query: 'registry',
      types: ['library'],
      scopes: ['@factorywager'],
      tags: ['registry'],
      sort: 'name',
      project: '',
    });

    expect(filtered.map(([name]) => name)).toEqual(['@factorywager/registry-client']);
    expect(applyFilters(packages, {
      query: '',
      types: [],
      scopes: ['unscoped'],
      tags: [],
      sort: 'name',
      project: '',
    }).map(([name]) => name)).toEqual(['event-store']);
  });

  test('uses OR semantics for multiple scopes and rejects unknown scopes', () => {
    expect(applyFilters(packages, {
      query: '',
      types: [],
      scopes: ['@factory', 'unscoped'],
      tags: [],
      sort: 'name',
      project: '',
    }).map(([name]) => name)).toEqual(['@factory/health-check', 'event-store']);
    expect(applyFilters(packages, {
      query: '',
      types: [],
      scopes: ['@unknown'],
      tags: [],
      sort: 'name',
      project: '',
    })).toEqual([]);
  });

  test('keeps malformed wire names as text-only scope values', () => {
    const hostile = [
      packageEntry('@scope"><img src=x onerror=alert(1)>/pkg', 'library', []),
    ];
    expect(collectScopes(hostile)).toEqual(['@scope"><img src=x onerror=alert(1)>']);
  });
});

describe('registry package scope markup', () => {
  test('exposes accessible scope controls, result context, and freshness', async () => {
    const html = await Bun.file('public/portal/index.html').text();
    const app = await Bun.file('public/portal/app.js').text();

    expect(html).toContain('aria-labelledby="filter-scope-label"');
    expect(html).toContain('id="filter-scopes"');
    expect(html).toContain('id="filter-summary"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('id="clear-filters"');
    expect(html).toContain('id="registry-freshness"');
    expect(app).toContain("button.setAttribute('aria-pressed', String(active))");
    expect(app).toContain('button.textContent = value');
    expect(app).toContain("window.addEventListener('hashchange', syncFiltersFromHash)");
    expect(app).toContain('REGISTRY_FRESHNESS_THRESHOLD_MS = 24 * 60 * 60 * 1000');
    expect(app).toContain("banner.dataset.freshness = ageMs === null ? 'unknown' : stale ? 'stale' : 'fresh'");
    expect(app).toContain("mode === 'edge' ? 'Edge' : 'Snapshot'");
    expect(app).not.toContain("mode === 'live'");
  });
});
