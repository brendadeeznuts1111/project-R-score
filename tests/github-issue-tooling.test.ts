// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

import {
  auditParsedGithubIssues,
  buildGithubLabelSyncPlan,
  formatGithubIssueAudit,
  formatGithubLabelSyncPlan,
} from '../lib/github-issue-tooling.ts';
import {
  parseGithubIssueSpineFromProvider,
  type GithubProviderIssue,
} from '../lib/github-issue-tooling-wire.ts';
import type { GitHubRepositoryRef } from '../lib/github-repository-ref.ts';
import {
  applyGithubLabelSyncPlan,
  assertGithubLabelWriteAuthorized,
  fetchGithubIssues,
  parseGithubIssueToolArgs,
  parseGithubIssueToolNetwork,
  type GithubFetch,
} from '../tools/github-issue-doctor.ts';

const REPOSITORY: GitHubRepositoryRef = {
  host: 'github.com',
  owner: 'factorywager',
  name: 'artifact',
  remote: 'origin',
  source: 'canonical',
};

function migratedIssue(
  number: number,
  artifactId: string, // brand-ok — raw provider-body fixture at the wire boundary
  conceptId?: string // brand-ok — raw optional provider-body fixture at the wire boundary
): GithubProviderIssue {
  const spine = {
    schema: 'factorywager.issue-spine.v1',
    artifactId,
    ...(conceptId ? { conceptId } : {}),
    type: 'bug',
    priority: 'p1',
    plane: 'local',
    runtime: 'bun',
    team: 'infrastructure',
    status: 'active',
  };
  return {
    number,
    title:
      number === 235
        ? '[P1][HARNESS] Make port allocation collision-safe'
        : '[P1][HARNESS] Resolve staged checkout fixtures',
    body: `## Repository spine\n\n### Machine-readable issue spine\n\n\`\`\`json\n${JSON.stringify(spine, null, 2)}\n\`\`\``,
    labelNames: [
      'bug',
      'p1',
      'plane-local',
      'bun-native',
      'team-infrastructure',
      'status-active',
      'high-priority',
    ],
  };
}

describe('GitHub issue tooling', () => {
  test('migrated #235 and #236 parse once and audit cleanly', () => {
    const parsed = [
      parseGithubIssueSpineFromProvider(migratedIssue(235, 'boundary-fixtures')),
      parseGithubIssueSpineFromProvider(
        migratedIssue(236, 'ssot-flow-soft', 'publish.ssot_flow_soft')
      ),
    ];
    const report = auditParsedGithubIssues(parsed);
    expect(report).toEqual({
      kind: 'github-issue-audit',
      ok: true,
      issues: 2,
      findings: [],
    });
    expect(formatGithubIssueAudit(report)).toBe(
      'github-issue-audit · ok · 2 issues · 0 findings'
    );
  });

  test('HTML comment blocks remain supported during migration', () => {
    const issue = migratedIssue(235, 'boundary-fixtures');
    const body = `<!--\nfactorywager.issue-spine.v1\n${JSON.stringify({
      artifactId: 'boundary-fixtures',
      priority: 'p1',
      plane: 'local',
      runtime: 'bun',
      status: 'active',
    })}\n-->`;
    const parsed = parseGithubIssueSpineFromProvider({ ...issue, body });
    expect(parsed.spine.type).toBe('bug');
    expect(parsed.spine.team).toBe('infrastructure');
  });

  test('audit reports missing, conflicting, and unknown labels deterministically', () => {
    const issue = migratedIssue(235, 'boundary-fixtures');
    const parsed = parseGithubIssueSpineFromProvider({
      ...issue,
      labelNames: issue.labelNames.filter(name => name !== 'status-active'),
    });
    const report = auditParsedGithubIssues([
      {
        ...parsed,
        provider: {
          ...parsed.provider,
          labelNames: [...parsed.provider.labelNames, 'p2', 'legacy queue'],
        },
      },
    ]);
    expect(report.ok).toBeFalse();
    expect(report.findings.map(row => row.code)).toEqual([
      'conflicting-label',
      'missing-label',
      'unknown-label',
    ]);
  });

  test('label sync plan is stable, provider-native, and deletion-free', () => {
    const plan = buildGithubLabelSyncPlan([
      { name: 'bug', description: "Something isn't working", color: 'd73a4a' },
      { name: 'p1', description: 'old', color: 'ffffff' },
      { name: 'operator-only', description: 'preserved', color: '000000' },
    ]);
    expect(plan[0]).toEqual(
      expect.objectContaining({ action: 'create', name: 'bun-native' })
    );
    expect(plan.find(row => row.name === 'p1')).toEqual({
      action: 'update',
      name: 'p1',
      before: { description: 'old', color: 'ffffff' },
      after: { description: 'Priority 1 work', color: 'bfdadc' },
    });
    expect(plan.some(row => row.name === 'operator-only')).toBeFalse();
    expect(plan.every(row => /^[0-9a-f]{6}$/.test(row.after.color))).toBeTrue();
    expect(
      formatGithubLabelSyncPlan([
        {
          action: 'create',
          name: 'p2',
          after: { description: 'Priority 2 work', color: '8b949e' },
        },
      ])
    ).toBe('github-label-sync · 1 mutation(s)\nCREATE p2 · 8b949e · Priority 2 work');
  });

  test('write mode requires exact repository confirmation', () => {
    const safe = parseGithubIssueToolArgs(['sync-labels', '--dry-run']);
    expect(safe.dryRun).toBeTrue();
    expect(() => assertGithubLabelWriteAuthorized(safe, REPOSITORY)).toThrow(
      '--write --confirm=factorywager/artifact'
    );
    const write = parseGithubIssueToolArgs([
      'sync-labels',
      '--write',
      '--confirm=factorywager/artifact',
    ]);
    expect(() => assertGithubLabelWriteAuthorized(write, REPOSITORY)).not.toThrow();
    expect(() => parseGithubIssueToolArgs(['audit', '--write'])).toThrow('read-only');
    expect(() =>
      parseGithubIssueToolArgs(['sync-labels', '--write', '--dry-run'])
    ).toThrow('mutually exclusive');
  });

  test('network boundary respects URL components and ignores server bind env', () => {
    const network = parseGithubIssueToolNetwork('http://127.0.0.1:8787/api/v3', {
      PORT: '3000',
      BUN_PORT: '4000',
      GITHUB_TOKEN: 'test-token',
    });
    expect(network.apiBaseUrl.protocol).toBe('http:');
    expect(network.apiBaseUrl.hostname).toBe('127.0.0.1');
    expect(network.apiBaseUrl.port).toBe('8787');
    expect(network.apiBaseUrl.pathname).toBe('/api/v3/');
    expect(network.tokenSource).toBe('GITHUB_TOKEN');
  });

  test('injected fetch keeps network tests deterministic without shared ports', async () => {
    const requests: Array<{ url: string; method: string }> = [];
    const fetcher: GithubFetch = async (input, init) => {
      requests.push({ url: String(input), method: init?.method ?? 'GET' });
      if (String(input).endsWith('/issues/235')) {
        return Response.json({
          number: 235,
          title: '[P1][HARNESS] Fixture',
          body: migratedIssue(235, 'boundary-fixtures').body,
          labels: migratedIssue(235, 'boundary-fixtures').labelNames.map(name => ({ name })),
        });
      }
      return Response.json({}, { status: 200 });
    };
    const network = parseGithubIssueToolNetwork('https://api.example.test/api/v3', {});
    const issues = await fetchGithubIssues(REPOSITORY, network, [235], fetcher);
    expect(issues).toHaveLength(1);
    expect(requests[0]?.url).toBe(
      'https://api.example.test/api/v3/repos/factorywager/artifact/issues/235'
    );

    const writeNetwork = { ...network, token: 'fixture', tokenSource: 'GITHUB_TOKEN' as const };
    await applyGithubLabelSyncPlan(
      REPOSITORY,
      writeNetwork,
      [{ action: 'create', name: 'p2', after: { description: 'Priority 2 work', color: '8b949e' } }],
      fetcher
    );
    expect(requests[1]).toEqual({
      url: 'https://api.example.test/api/v3/repos/factorywager/artifact/labels',
      method: 'POST',
    });
  });

  test('general issue form owns the spine while specialized P0 templates remain intact', async () => {
    const form = await Bun.file('.github/ISSUE_TEMPLATE/harness.yml').text();
    expect(form).toContain('id: issue_spine');
    expect(form).toContain('factorywager.issue-spine.v1');
    expect(form).toContain('render: json');
    for (const label of [
      'enhancement',
      'p1',
      'plane-local',
      'bun-native',
      'team-infrastructure',
      'status-planned',
    ]) {
      expect(form).toContain(`  - ${label}`);
    }
    for (const template of [
      'p0-arch-missing-module.md',
      'p0-compliance-token-hashing.md',
      'p0-deps-remove-unused.md',
      'p0-security-auth.md',
      'p0-security-cors.md',
      'p0-security-event-stream.md',
    ]) {
      expect(await Bun.file(`.github/ISSUE_TEMPLATE/${template}`).exists(), template).toBeTrue();
    }
  });
});
