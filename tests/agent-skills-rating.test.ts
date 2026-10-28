import { describe, expect, test } from 'bun:test';
import {
  applyDynamicEvidence,
  parseDynamicEvidenceModel,
  rateAgentSkills,
  rateSkillContent,
  type DynamicEvidenceCheck,
  type DynamicEvidenceModel,
} from '../scripts/rate-agent-skills.ts';

describe('rateSkillContent', () => {
  test('penalizes unbounded shell, Node fs, SQLite, fetch, and server guidance', () => {
    const rating = rateSkillContent(
      'unsafe',
      [
        '```bash',
        'rm -rf dist',
        '```',
        "import { readFileSync } from 'fs';",
        "import Database from 'better-sqlite3';",
        "fetch('https://example.com/critical');",
        'Bun.serve({ fetch() { return new Response("ok") } });',
      ].join('\n')
    );
    expect(rating.findings.map(finding => finding.rule)).toEqual(
      expect.arrayContaining([
        'shell-portability',
        'node-fs-substitution',
        'sqlite-native',
        'fetch-timeout',
        'server-reload',
      ])
    );
  });

  test('accepts Bun-native alternatives and awards canonical bun x', () => {
    const rating = rateSkillContent(
      'native',
      [
        "import { $ } from 'bun';",
        'console.log(Bun.version);',
        'await $`rm -rf dist`;',
        'await Bun.file("input.txt").text();',
        'await fetch("https://example.com", { signal: AbortSignal.timeout(5_000) });',
        'Bun.serve({ fetch() { return new Response("ok") } });',
        'bun run --hot dev',
        'bun x wrangler --version',
      ].join('\n')
    );
    expect(rating.findings.filter(finding => finding.delta < 0)).toEqual([]);
    expect(rating.complianceScore).toBe(100);
  });

  test('accepts the Bun.$ namespace form of Bun Shell', () => {
    const rating = rateSkillContent('native-namespace-shell', 'await Bun.$`rm -rf dist`;');
    expect(rating.findings.map(finding => finding.rule)).not.toContain('shell-portability');
  });

  test('rejects invented watcher and lock APIs', () => {
    const rating = rateSkillContent(
      'invented-apis',
      ["import { Lock } from 'bun';", 'Bun.watch({ paths: ["skills"] });'].join('\n')
    );
    expect(rating.findings.map(finding => finding.rule)).toEqual(
      expect.arrayContaining(['unsupported-bun-watch', 'unsupported-bun-lock'])
    );
  });

  test('version-gates cron and requires scheduled child termination', () => {
    const unsafe = rateSkillContent(
      'unsafe-cron',
      "Bun.cron('0 * * * *', async () => { await Bun.spawn(['bun', 'deep.ts']).exited; });"
    );
    expect(unsafe.findings.map(finding => finding.rule)).toEqual(
      expect.arrayContaining(['runtime-version', 'scheduled-child-timeout'])
    );

    const safe = rateSkillContent(
      'safe-cron',
      [
        'if (Bun.version < "1.3.12") throw new Error("Bun 1.3.12 required");',
        "Bun.cron('0 * * * *', async () => {",
        "  const child = Bun.spawn(['bun', 'deep.ts']);",
        '  setTimeout(() => child.kill(), 600_000);',
        '  await child.exited;',
        '});',
      ].join('\n')
    );
    expect(safe.findings.filter(finding => finding.delta < 0)).toEqual([]);
    expect(rateSkillContent('cron-boundary', 'dailyCheck (no Bun.cron)').findings).toEqual([]);
  });

  test('does not require --bun unless guidance invokes a Node-backed script', () => {
    expect(rateSkillContent('ordinary', 'bun run test').findings).toEqual([]);
    const forced = rateSkillContent(
      'node-backed',
      '{ "scripts": { "legacy": "node legacy.js" } }\nbun run legacy'
    );
    expect(forced.findings.map(finding => finding.rule)).toContain('bun-runtime-enforcement');
  });

  test('does not treat the sqlite3 inspection CLI as a dependency', () => {
    const rating = rateSkillContent('inspect', 'sqlite3 local.db # inspect local state');
    expect(rating.findings.map(finding => finding.rule)).not.toContain('sqlite-native');
  });

  test('version-gates Bun.XML substitution at the Bun 1.4 boundary', () => {
    const packageGuidance = "import { XMLParser } from 'fast-xml-parser';";
    expect(
      rateSkillContent('xml-on-1.3', packageGuidance, 1, { runtimeVersion: '1.3.14' }).findings
    ).toEqual([]);
    expect(
      rateSkillContent('xml-on-1.4', packageGuidance, 1, { runtimeVersion: '1.4.0' }).findings.map(
        finding => finding.rule
      )
    ).toContain('xml-native');

    const premature = rateSkillContent('premature-xml', 'Bun.XML.parse(input)', 1, {
      runtimeVersion: '1.3.14',
    });
    expect(premature.findings.map(finding => finding.rule)).toEqual(
      expect.arrayContaining(['unsupported-bun-xml', 'runtime-version'])
    );

    const guarded = rateSkillContent(
      'guarded-xml',
      'if (!Bun.semver.satisfies(Bun.version, ">=1.4.0")) throw new Error("Bun 1.4 required");\nBun.XML.parse(input)',
      1,
      { runtimeVersion: '1.3.14' }
    );
    expect(guarded.findings.filter(finding => finding.delta < 0)).toEqual([]);
  });

  test('penalizes operational npm commands and oversized skill bodies', () => {
    const rating = rateSkillContent('legacy', 'npm install package', 1, { skillLines: 600 });
    expect(rating.findings.map(finding => finding.rule)).toEqual(
      expect.arrayContaining(['node-package-command', 'progressive-disclosure'])
    );
  });

  test('accepts an explicit compatibility boundary around upstream package-manager examples', () => {
    const rating = rateSkillContent(
      'upstream-reference',
      'Upstream npm/npx examples are compatibility references. Translate them through the owning repository package manager in a Bun-owned project.\n\nnpx wrangler types'
    );
    expect(rating.findings.map(finding => finding.rule)).not.toContain('node-package-command');
  });

  test('does not confuse bun install helper names with package installation', () => {
    const rating = rateSkillContent(
      'helper-name',
      'CI helper: bun install-docs --topic lockfile'
    );
    expect(rating.findings.map(finding => finding.rule)).not.toContain(
      'install-frozen-lockfile'
    );
  });

  test('requires Bun environment grounding in configuration guidance', () => {
    const rating = rateSkillContent(
      'environment',
      '## Environment configuration\nconst token = process.env.API_TOKEN;'
    );
    expect(rating.findings.map(finding => finding.rule)).toContain('environment-accessor');
    expect(
      rateSkillContent(
        'bun-environment',
        '## Environment configuration\nconst token = Bun.env.API_TOKEN;'
      ).findings
    ).toEqual([]);
  });
});

describe('dynamic skill evidence', () => {
  const model: DynamicEvidenceModel = {
    schemaVersion: 1,
    model: 'finite-evidence-v2',
    minimumOverallScore: 70,
    weights: { compliance: 0.5, structure: 0.15, evidence: 0.35 },
    prior: { alpha: 1, beta: 1 },
    confidenceScale: 3,
    proofs: [],
  };
  const check = (
    id: string,
    ok: boolean,
    attribution: DynamicEvidenceCheck['attribution'] = {
      kind: 'skills',
      names: ['example'],
    },
    dimension: DynamicEvidenceCheck['dimension'] = 'runtime'
  ): DynamicEvidenceCheck => ({
    id,
    ok,
    attribution,
    dimension,
    observedAt: '2026-08-16T12:00:00.000Z',
    durationNs: 1_000_000,
    durationMs: 1,
    stdoutSha256: 'a'.repeat(64),
    stderrSha256: 'b'.repeat(64),
    commandSha256: 'c'.repeat(64),
  });

  test('keeps static compliance separate and never turns finite passing evidence into certainty', () => {
    const staticRating = rateSkillContent('example', 'bun --version');
    const [dynamic] = applyDynamicEvidence(
      staticRating ? [staticRating] : [],
      [
        check('structure', true, { kind: 'active-skills' }, 'structure'),
        check('runtime-one', true),
        check('runtime-two', true),
      ],
      model
    );
    expect(staticRating.complianceScore).toBe(100);
    expect(staticRating.scoreKind).toBe('static-compliance');
    expect(dynamic?.evidenceScore).toBe(75);
    expect(dynamic?.overallScore).toBe(91);
    expect(dynamic?.overallScore).toBeLessThan(100);
    expect(dynamic?.confidence).toBeLessThan(100);
  });

  test('scopes owned proof and lowers evidence when a live check fails', () => {
    const ratings = [rateSkillContent('owned', ''), rateSkillContent('unowned', '')];
    const dynamic = applyDynamicEvidence(
      ratings,
      [
        check('structure', true, { kind: 'active-skills' }, 'structure'),
        check('model', true, { kind: 'portfolio' }, 'model'),
        check('owned-pass', true, { kind: 'skills', names: ['owned'] }),
        check('owned-failure', false, { kind: 'skills', names: ['owned'] }),
      ],
      model
    );
    expect(dynamic.find(rating => rating.name === 'owned')).toMatchObject({
      status: 'proven',
      checksPassed: 1,
      checksTotal: 2,
      evidenceScore: 50,
      overallScore: 83,
    });
    expect(dynamic.find(rating => rating.name === 'unowned')).toMatchObject({
      status: 'unproven',
      checksPassed: 0,
      checksTotal: 0,
      evidenceScore: null,
      overallScore: null,
    });
  });

  test('rejects invalid proof attribution before executing commands', () => {
    const raw = {
      $schema: './schemas/skill-rating-evidence.schema.json',
      schemaVersion: 1,
      model: 'finite-evidence-v2',
      minimumOverallScore: 70,
      weights: { compliance: 0.5, structure: 0.15, evidence: 0.35 },
      prior: { alpha: 1, beta: 1 },
      confidenceScale: 3,
      proofs: [
        {
          id: 'bad-runtime-proof',
          dimension: 'runtime',
          attribution: { kind: 'active-skills' },
          command: ['bun', '--version'],
          timeoutMs: 1_000,
        },
      ],
    };
    expect(() => parseDynamicEvidenceModel(raw, ['example'])).toThrow(
      'explicit skill attribution'
    );
    expect(() =>
      parseDynamicEvidenceModel(
        {
          ...raw,
          proofs: [
            {
              ...raw.proofs[0],
              attribution: { kind: 'skills', names: ['inactive'] },
            },
          ],
        },
        ['example']
      )
    ).toThrow('inactive skill');
  });
});

test('repository ratings cover every active governed skill', async () => {
  const result = await rateAgentSkills();
  expect(result.ratings).toHaveLength(19);
  expect(result.runtime.version).toBe(Bun.version);
  expect(result.dynamic).toBeNull();
});
