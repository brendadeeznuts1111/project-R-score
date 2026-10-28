import { afterEach, describe, expect, test } from 'bun:test';
// eslint-disable-next-line no-restricted-imports -- test isolation needs a disposable directory.
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { acceptQualityBaseline } from '../lib/quality/baseline.ts';
import { canonicalJsonDigests, utf8TextDigests } from '../lib/quality/canonical-json.ts';
import { INVARIANT_LANES } from '../lib/quality/invariant-runner.ts';
import {
  createQualityReport,
  renderQualityReportHtml,
  renderQualityReportJson,
  renderQualityReportMarkdown,
  type QualityReport,
} from '../lib/quality/report.ts';
import { writeQualityReport } from '../lib/quality/report-store.ts';
import type { QualityCheck } from '../lib/quality/result.ts';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(path => rm(path, { recursive: true })));
});

function changedCheck(overrides: Partial<QualityCheck> = {}): QualityCheck {
  return {
    id: 'technical.registry-shape',
    owner: 'tests/quality-report.test.ts',
    layer: 'technical',
    severity: 'error',
    passed: true,
    changed: true,
    semanticDigest: 'candidate-digest',
    snapshotApproval: 'eligible',
    evidence: { cases: 12, seed: 42 },
    ...overrides,
  };
}

function report(overrides: { checks?: QualityCheck[] } = {}): QualityReport {
  return createQualityReport({
    runId: 'quality-20260816t120000z',
    scope: 'registry-shape',
    generatedAt: '2026-08-16T12:00:00.000Z',
    runtime: { bunVersion: '1.3.14', bunRevision: '1.3.14+test' },
    source: {
      repositoryRevision: 'abc123',
      repositoryDirty: true,
      command: 'bun run test:invariants',
      exitCode: 0,
      durationNs: 2_500_000,
    },
    checks: overrides.checks ?? [changedCheck()],
    snapshot: { baseline: { rows: [1] }, candidate: { rows: [1, 2] } },
  });
}

describe('quality report renderers', () => {
  test('invariant catalog preserves technical and domain ownership', () => {
    expect(new Set(INVARIANT_LANES.map(lane => lane.id)).size).toBe(INVARIANT_LANES.length);
    expect(INVARIANT_LANES.map(lane => lane.layer)).toContain('domain');
    expect(INVARIANT_LANES.map(lane => lane.layer)).toContain('technical');
    expect(INVARIANT_LANES.find(lane => lane.layer === 'domain')?.snapshotApproval).toBe(
      'manual-only'
    );
  });

  test('one envelope drives canonical JSON, Markdown, and semantic landmark HTML', () => {
    const value = report();
    const json = renderQualityReportJson(value);
    const markdown = renderQualityReportMarkdown(value);
    const html = renderQualityReportHtml(value);

    expect(JSON.parse(json)).toMatchObject({
      schemaVersion: 1,
      scope: 'registry-shape',
      summary: { verdict: 'update-candidate', changed: 1 },
    });
    expect(markdown).toContain('# Quality report: registry-shape');
    expect(markdown).toContain('2.500 ms');
    expect(markdown).toContain('abc123 (dirty)');
    expect(html.match(/<main\b/g)).toHaveLength(1);
    expect(html).toContain('href="#quality-main"');
    expect(html).toContain('<header class="quality-header quality-shell"');
    expect(html).toContain('<nav class="quality-nav quality-shell" aria-label=');
    expect(html).toContain('<main id="quality-main"');
    expect(html).toContain('<section class="quality-section" aria-labelledby=');
    expect(html).toContain('<aside class="quality-meta-panel" aria-labelledby=');
    expect(html).toContain('<footer class="quality-footer quality-shell">');
    expect(html).toContain('<dt>Repository state</dt><dd>dirty</dd>');
    expect(html).toContain('<caption>Invariant and snapshot evidence by owner</caption>');
    expect(html).not.toContain('role="main"');
  });

  test('report integrity excludes only its own digest field', () => {
    const value = report();
    const { integrity: _integrity, ...core } = value;
    expect(value.integrity.sha3_256).toBe(canonicalJsonDigests(core).sha3_256);
  });
});

describe('quality report history', () => {
  test('writes dated history and /latest artifacts atomically', async () => {
    const root = await mkdtemp('/tmp/project-r-quality-report-');
    temporaryDirectories.push(root);
    const paths = await writeQualityReport(report(), root);
    expect(paths.historyDirectory).toEndWith('/2026-08-16/quality-20260816t120000z');
    expect(paths.latestDirectory).toEndWith('/latest');
    for (const directory of [paths.historyDirectory, paths.latestDirectory]) {
      expect(await Bun.file(join(directory, 'index.html')).exists()).toBe(true);
      expect(await Bun.file(join(directory, 'report.json')).exists()).toBe(true);
      expect(await Bun.file(join(directory, 'report.md')).exists()).toBe(true);
      expect(await Bun.file(join(directory, 'manifest.json')).exists()).toBe(true);
    }
    const latestJson = await Bun.file(join(paths.latestDirectory, 'report.json')).text();
    const manifest = await Bun.file(join(paths.latestDirectory, 'manifest.json')).json();
    expect(manifest.artifacts.json).toEqual(utf8TextDigests(latestJson));
  });
});

describe('guarded baseline acceptance', () => {
  test('accepts only the reviewed candidate against the expected current digest', async () => {
    const root = await mkdtemp('/tmp/project-r-quality-baseline-');
    temporaryDirectories.push(root);
    const baselinePath = join(root, 'registry-shape.json');
    const baseline = { rows: [1] };
    const candidate = { rows: [1, 2] };
    await Bun.write(baselinePath, JSON.stringify(baseline));
    const accepted = await acceptQualityBaseline({
      report: report(),
      candidate,
      scope: 'registry-shape',
      baselinePath,
      expectedBaselineSha3: canonicalJsonDigests(baseline).sha3_256,
    });
    expect(accepted.acceptedSha3).toBe(canonicalJsonDigests(candidate).sha3_256);
    expect(await Bun.file(baselinePath).json()).toEqual(candidate);
    expect(await Bun.file(`${baselinePath}.lock`).exists()).toBe(false);
  });

  test('rejects stale baselines, tampered reports, and protected changes', async () => {
    const root = await mkdtemp('/tmp/project-r-quality-reject-');
    temporaryDirectories.push(root);
    const baselinePath = join(root, 'registry-shape.json');
    await Bun.write(baselinePath, '{"rows":[1]}');
    await expect(
      acceptQualityBaseline({
        report: report(),
        candidate: { rows: [1, 2] },
        scope: 'registry-shape',
        baselinePath,
        expectedBaselineSha3: '0'.repeat(64),
      })
    ).rejects.toThrow('changed since review');

    const tampered = JSON.parse(renderQualityReportJson(report()));
    tampered.scope = 'other';
    await expect(
      acceptQualityBaseline({
        report: tampered,
        candidate: { rows: [1, 2] },
        scope: 'registry-shape',
        baselinePath,
        expectedBaselineSha3: canonicalJsonDigests({ rows: [1] }).sha3_256,
      })
    ).rejects.toThrow('integrity mismatch');

    const protectedReport = report({
      checks: [
        changedCheck({
          id: 'policy.rate',
          layer: 'policy',
          snapshotApproval: 'manual-only',
        }),
      ],
    });
    await expect(
      acceptQualityBaseline({
        report: protectedReport,
        candidate: { rows: [1, 2] },
        scope: 'registry-shape',
        baselinePath,
        expectedBaselineSha3: canonicalJsonDigests({ rows: [1] }).sha3_256,
      })
    ).rejects.toThrow('update-candidate');
  });
});
