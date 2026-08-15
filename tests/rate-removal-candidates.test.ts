// @see https://bun.com/docs/test
import { describe, expect, test } from 'bun:test';
import {
  collectUsageEvidence,
  confidenceFor,
  detectProtocol,
  gradeLabel,
  protocolLabel,
  scoreRemoval,
  sectionLabel,
  type RemovalSignals,
} from '../scripts/rate-removal-candidates.ts';
import { createTestWorkspace } from './harness.ts';

function usage(total = 0): RemovalSignals['usage'] {
  return { sourceImports: total, configReferences: 0, scriptInvocations: 0, total };
}

function base(over: Partial<RemovalSignals> = {}): RemovalSignals {
  return {
    usage: usage(),
    tierA: false,
    protected: false,
    internalProtocol: false,
    catalog: false,
    optionalOnly: false,
    peerOnly: false,
    rootOnly: true,
    declarationCount: 1,
    stoOnly: false,
    ...over,
  };
}

describe('rate-removal-candidates scoring', () => {
  test('detectProtocol', () => {
    expect(detectProtocol('workspace:*')).toBe('workspace');
    expect(detectProtocol('catalog:')).toBe('catalog');
    expect(detectProtocol('file:../x')).toBe('file');
    expect(detectProtocol('1.2.3')).toBe('npm');
    expect(detectProtocol('^1.0.0')).toBe('npm');
  });

  test('protected packages score 0', () => {
    const r = scoreRemoval(base({ protected: true }));
    expect(r.score).toBe(0);
    expect(r.grade).toBe('locked');
  });

  test('workspace protocol is protected', () => {
    const r = scoreRemoval(base({ internalProtocol: true }));
    expect(r.grade).toBe('locked');
  });

  test('unused Tier-A dependency is a candidate', () => {
    const r = scoreRemoval(base({ tierA: true, usage: usage() }));
    expect(r.score).toBeGreaterThanOrEqual(75);
    expect(r.grade).toBe('candidate');
  });

  test('heavy executable usage retains package', () => {
    const r = scoreRemoval(base({ usage: usage(50), rootOnly: false }));
    expect(r.grade).toBe('retain');
    expect(r.score).toBeLessThanOrEqual(30);
  });

  test('catalog unused is review not automatic remove', () => {
    const r = scoreRemoval(base({ catalog: true, usage: usage() }));
    expect(r.grade).toBe('review');
    expect(r.reasons.some(reason => reason.code === 'catalog-contract')).toBe(true);
  });

  test('peer-only contracts are not treated as weak removable dependencies', () => {
    const r = scoreRemoval(base({ peerOnly: true, rootOnly: false }));
    expect(r.grade).toBe('review');
    expect(r.reasons.some(reason => reason.code === 'peer-contract')).toBe(true);
  });

  test('table labels are human-readable', () => {
    expect(gradeLabel('candidate')).toBe('CANDIDATE');
    expect(gradeLabel('locked')).toBe('LOCKED');
    expect(sectionLabel('devDependencies')).toBe('dev');
    expect(protocolLabel('workspace')).toBe('workspace:*');
    expect(protocolLabel('npm')).toBe('npm registry');
  });

  test('confidence: root unused is high; STO-only zero hits is low', () => {
    expect(confidenceFor(base({ usage: usage(), rootOnly: true }), 'candidate')).toBe('high');
    expect(confidenceFor(base({ usage: usage(), rootOnly: false, stoOnly: true }), 'review')).toBe(
      'low'
    );
    expect(confidenceFor(base({ usage: usage(50) }), 'retain')).toBe('high');
  });

  test('STO-only unused is down-scored vs root unused', () => {
    const root = scoreRemoval(base({ usage: usage(), rootOnly: true, stoOnly: false }));
    const sto = scoreRemoval(
      base({ usage: usage(), rootOnly: false, stoOnly: true, declarationCount: 1 })
    );
    expect(root.score).toBeGreaterThan(sto.score);
    expect(sto.grade).toBe('review');
  });

  test('single-pass usage evidence separates imports, scripts, and config references', async () => {
    await using workspace = await createTestWorkspace('removal-grading-');
    await Bun.write(
      workspace.resolve('source.ts'),
      `import { x } from "alpha/subpath";\nconst lazy = import("beta");\n`
    );
    await Bun.write(
      workspace.resolve('package.json'),
      JSON.stringify({ scripts: { alpha: 'bunx alpha --check' } })
    );
    await Bun.write(workspace.resolve('theme.css'), `@import "gamma/theme.css";`);

    const evidence = await collectUsageEvidence(workspace.root, ['alpha', 'beta', 'gamma']);
    expect(evidence.get('alpha')).toEqual({
      sourceImports: 1,
      configReferences: 0,
      scriptInvocations: 1,
      total: 2,
    });
    expect(evidence.get('beta')?.sourceImports).toBe(1);
    expect(evidence.get('gamma')?.configReferences).toBe(1);
  });

  test('filtered JSON distinguishes displayed, matched, and evaluated totals', async () => {
    const proc = Bun.spawn(
      ['bun', 'scripts/rate-removal-candidates.ts', '--only-candidates', '--limit', '1', '--json'],
      { cwd: import.meta.dir + '/..', stdout: 'pipe', stderr: 'pipe' }
    );
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    expect(exitCode).toBe(0);
    expect(stderr).toBe('');
    const report = JSON.parse(stdout) as {
      count: number;
      matched: number;
      total: number;
      candidates: Array<{ grade: string }>;
    };
    expect(report.total).toBeGreaterThan(0);
    expect(report.total).toBeGreaterThanOrEqual(report.matched);
    expect(report.matched).toBeGreaterThanOrEqual(report.count);
    expect(report.candidates.every(candidate => candidate.grade === 'candidate')).toBe(true);
  });
});
