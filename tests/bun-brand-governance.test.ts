import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { CRITICAL_PROOF_PATHS } from '../lib/harness/proof.ts';
import { loadBunBrandMapSummarySliceSync } from '../lib/monitoring/bun-brand-map-slice.ts';
import { addedBunBrandBaselineKeys } from '../scripts/check-bun-brand-baseline.ts';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(path => rm(path, { recursive: true, force: true }))
  );
});

async function writeArtifact(value: unknown): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'bun-brand-governance-'));
  temporaryDirectories.push(dir);
  const path = join(dir, 'bun-brand-map.json');
  await Bun.write(path, `${JSON.stringify(value)}\n`);
  return path;
}

describe('Bun brand governance wiring', () => {
  test('staged brand gate runs before the project-only early return', async () => {
    const source = await Bun.file('scripts/pre-commit-harness.ts').text();
    expect(source.indexOf("'brands-staged'")).toBeGreaterThan(-1);
    expect(source.indexOf("'brands-staged'")).toBeLessThan(
      source.indexOf('if (harnessFiles.length === 0)')
    );
  });

  test('PR CI compares additions against the pull request base SHA', async () => {
    const workflow = await Bun.file('.github/workflows/harness-gates.yml').text();
    expect(workflow).toContain('bun run check:brands:diff');
    expect(workflow).toContain('bun:brand-map:baseline:ratchet');
    expect(workflow).toContain('github.event.pull_request.base.sha');
  });

  test('warning baseline ratchet permits removal but rejects additions', () => {
    expect(addedBunBrandBaselineKeys(['a', 'b'], ['b'])).toEqual([]);
    expect(addedBunBrandBaselineKeys(['a'], ['a', 'c', 'c', 'b'])).toEqual(['b', 'c']);
  });

  test('cross-map bake follows capability and brand bakes and precedes ops', async () => {
    const source = await Bun.file('tools/bake-all.ts').text();
    const capabilities = source.indexOf("id: 'capabilities'");
    const brands = source.indexOf("id: 'brands'");
    const crossMap = source.indexOf("id: 'bun-brand-map'");
    const ops = source.indexOf("id: 'ops'");
    expect(capabilities).toBeLessThan(brands);
    expect(brands).toBeLessThan(crossMap);
    expect(crossMap).toBeLessThan(ops);
  });

  test('cross-map has a continuous harness proof path without taxonomy registration', () => {
    expect(CRITICAL_PROOF_PATHS.find(path => path.id === 'bun-brand-cross-map')).toMatchObject({
      gateClass: 'continuous',
      gateRef: 'ci:harness',
      freshRerun: 'bun run bun:brand-map:check',
      owner: 'runtime-tooling',
    });
  });

  test('release and Bun definition versions remain aligned', async () => {
    const pkg = await Bun.file('package.json').json();
    expect(pkg.version.split('+')[0]).toBe(pkg.versioning.current);
    expect(pkg.catalog['@types/bun']).toBe(pkg.catalog['bun-types']);
    expect(Bun.semver.order(pkg.versioning.current, '5.3.0')).toBeGreaterThanOrEqual(0);
  });
});

describe('Bun brand ops slice', () => {
  test('legacy undeclared findings remain warnings and preserve project attribution', async () => {
    const path = await writeArtifact({
      generatedAt: '2026-07-28T00:00:00.000Z',
      summary: {
        declared: 9,
        observed: 15,
        matched: 8,
        undeclared: 7,
        baselineUndeclared: 7,
        newUndeclared: 0,
        projects: 2,
      },
      findings: [
        {
          kind: 'observed-undeclared',
          severity: 'warning',
          baseline: true,
        },
      ],
      projects: [
        {
          path: 'projects/active/sports-terminal-os',
          observed: 4,
          undeclared: 2,
          legacyUndeclared: 2,
          attention: 2,
        },
      ],
    });

    expect(loadBunBrandMapSummarySliceSync(path)).toMatchObject({
      available: true,
      ok: true,
      warnings: 7,
      errors: 0,
      stale: false,
      legacyUndeclared: 7,
      newUndeclared: 0,
      projectAttribution: [
        {
          path: 'projects/active/sports-terminal-os',
          observed: 4,
          undeclared: 2,
          legacyUndeclared: 2,
          attention: 2,
        },
      ],
    });
  });

  test('new undeclared and stale evidence degrade the slice', async () => {
    const path = await writeArtifact({
      summary: { baselineUndeclared: 3, newUndeclared: 1, stale: true },
      findings: [
        {
          kind: 'observed-undeclared',
          severity: 'error',
          baseline: false,
        },
      ],
    });

    expect(loadBunBrandMapSummarySliceSync(path)).toMatchObject({
      available: true,
      ok: false,
      warnings: 3,
      errors: 1,
      stale: true,
    });
  });

  test('missing or invalid artifacts are unavailable, not silently healthy', () => {
    expect(loadBunBrandMapSummarySliceSync('/definitely/missing/bun-brand-map.json')).toEqual({
      available: false,
      ok: false,
      warnings: 0,
      errors: 0,
      stale: false,
      path: '/registry/bun-brand-map.json',
    });
  });
});
