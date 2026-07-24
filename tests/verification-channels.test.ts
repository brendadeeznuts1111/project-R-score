// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  buildSemanticTags,
  describeChannelAuth,
  getRuntimeChannel,
  githubApiUrl,
  parseBunReleaseTag,
  parseCanaryRelease,
  parseCanaryVersion,
  resolveChannel,
  resolveGithubAuth,
  resolveGithubAuthToken,
  resolveProvenanceId,
  revisionMatchesTarget,
  verificationSnapshotFilename,
} from '../lib/verification/channels.ts';
import { generateJSONLD } from '../lib/verification/jsonld.ts';
import { diffChannelProofs, formatProofDiffSummary } from '../lib/verification/proof-diff.ts';
import type {
  ChannelAwareVerificationReport,
  SemanticTags,
  VerificationResult,
} from '../lib/verification/types.ts';

describe('lib/verification/channels', () => {
  test('getRuntimeChannel detects canary from version string', () => {
    const canary = getRuntimeChannel('1.4.0-canary.1');
    expect(canary.channel).toBe('canary');
    expect(canary.resolvedVersion).toBe('1.4.0-canary.1');
    expect(canary.resolveSource).toBe('runtime');

    const stable = getRuntimeChannel('1.3.14');
    expect(stable.channel).toBe('stable');
  });

  test('resolveChannel runtime returns current runtime metadata', async () => {
    const res = await resolveChannel('runtime', { runtimeVersion: '1.4.0-canary.1' });
    expect(res.channel).toBe('canary');
    expect(res.resolvedVersion).toBe('1.4.0-canary.1');
  });

  test('resolveChannel pinned semver', async () => {
    const res = await resolveChannel('1.3.14');
    expect(res.channel).toBe('pinned');
    expect(res.resolvedVersion).toBe('1.3.14');
    expect(res.isPinned).toBe(true);
    expect(res.resolveSource).toBe('pinned');
  });

  test('parseBunReleaseTag strips bun-v prefix', () => {
    expect(parseBunReleaseTag('bun-v1.3.14')).toBe('1.3.14');
    expect(parseBunReleaseTag('v1.3.14')).toBe('1.3.14');
  });

  test('parseCanaryVersion from release name', () => {
    expect(
      parseCanaryVersion({
        tag_name: 'canary',
        name: 'Canary (abcdef0123456789deadbeef)',
      })
    ).toBe('canary+abcdef012345');
  });

  test('parseCanaryRelease returns full + short commit', () => {
    const parsed = parseCanaryRelease({
      tag_name: 'canary',
      name: 'Canary (abcdef0123456789deadbeef)',
    });
    expect(parsed.displayVersion).toBe('canary+abcdef012345');
    expect(parsed.commitShort).toBe('abcdef012345');
    expect(parsed.commitFull).toBe('abcdef0123456789deadbeef');
  });

  test('revisionMatchesTarget compares commit prefixes', () => {
    expect(revisionMatchesTarget('abcdef0123459999', 'abcdef0123456789')).toBe(true);
    expect(revisionMatchesTarget('deadbeef0000', 'abcdef012345')).toBe(false);
    expect(revisionMatchesTarget(undefined, 'abc')).toBeUndefined();
  });

  test('githubApiUrl honors custom domain', () => {
    expect(githubApiUrl('/repos/x/y', 'api.example.com')).toBe(
      'https://api.example.com/repos/x/y'
    );
  });

  test('resolveChannel canary uses GitHub release mock', async () => {
    const res = await resolveChannel('canary', {
      allowGhCli: false,
      env: {},
      fetchImpl: async () =>
        Response.json({
          tag_name: 'canary',
          name: 'Canary (abcdef0123456789deadbeef)',
          body: 'This release of Bun corresponds to the commit: abcdef0123456789deadbeef',
        }),
    });
    expect(res.channel).toBe('canary');
    expect(res.resolvedVersion).toBe('canary+abcdef012345');
    expect(res.resolveSource).toBe('github-canary');
    expect(res.canaryCommitShort).toBe('abcdef012345');
    expect(res.canaryCommit).toBe('abcdef0123456789deadbeef');
    expect(res.channelReleaseUrl).toContain('github.com');
  });

  test('resolveChannel latest uses GitHub release mock', async () => {
    const res = await resolveChannel('latest', {
      allowGhCli: false,
      env: { GITHUB_TOKEN: 'test-token' },
      fetchImpl: async () =>
        Response.json({
          tag_name: 'bun-v1.3.14',
          name: 'Bun v1.3.14',
          html_url: 'https://github.com/Jarred-Sumner/bun-releases-for-updater/releases/tag/bun-v1.3.14',
          published_at: '2026-01-01T00:00:00Z',
        }),
    });
    expect(res.channel).toBe('latest');
    expect(res.resolvedVersion).toBe('1.3.14');
    expect(res.latestAtResolution).toBe('1.3.14');
    expect(res.resolveSource).toBe('github-updater');
    // anonymous-first: token unused when public feed succeeds
    expect(res.authSource).toBe('none');
    expect(res.channelReleaseUrl).toContain('bun-v1.3.14');
    expect(res.channelPublishedAt).toBe('2026-01-01T00:00:00Z');
  });

  test('preferAuth sends token on first request', async () => {
    let sawAuth = false;
    const res = await resolveChannel('latest', {
      allowGhCli: false,
      preferAuth: true,
      env: { GITHUB_TOKEN: 'test-token' },
      fetchImpl: async (_input, init) => {
        const headers = new Headers(init?.headers);
        if (headers.get('Authorization')) sawAuth = true;
        return Response.json({ tag_name: 'bun-v1.3.14' });
      },
    });
    expect(sawAuth).toBe(true);
    expect(res.authSource).toBe('GITHUB_TOKEN');
  });

  test('resolveChannel latest falls back to oven-sh/bun', async () => {
    let calls = 0;
    const res = await resolveChannel('latest', {
      allowGhCli: false,
      env: {},
      fetchImpl: async (input) => {
        calls++;
        const url = String(input);
        if (url.includes('bun-releases-for-updater')) {
          return new Response('nope', { status: 404 });
        }
        return Response.json({ tag_name: 'bun-v1.3.14' });
      },
    });
    expect(calls).toBe(2);
    expect(res.resolveSource).toBe('github-oven');
    expect(res.resolvedVersion).toBe('1.3.14');
  });

  test('403 error mentions auth when unauthenticated', async () => {
    await expect(
      resolveChannel('canary', {
        allowGhCli: false,
        env: {},
        fetchImpl: async () => new Response('forbidden', { status: 403 }),
      })
    ).rejects.toThrow(/GITHUB_TOKEN|gh auth/);
  });

  test('anonymous-first succeeds without sending a bad token', async () => {
    let sawAuth = false;
    let calls = 0;
    const res = await resolveChannel('latest', {
      allowGhCli: false,
      env: { GITHUB_TOKEN: 'bad-token' },
      fetchImpl: async (_input, init) => {
        calls++;
        const headers = new Headers(init?.headers);
        if (headers.get('Authorization')) sawAuth = true;
        return Response.json({ tag_name: 'bun-v1.3.14' });
      },
    });
    expect(calls).toBe(1);
    expect(sawAuth).toBe(false);
    expect(res.resolvedVersion).toBe('1.3.14');
    expect(res.authSource).toBe('none');
  });

  test('escalates to auth on anonymous 403', async () => {
    let calls = 0;
    const res = await resolveChannel('latest', {
      allowGhCli: false,
      env: { GITHUB_TOKEN: 'good-token' },
      fetchImpl: async (_input, init) => {
        calls++;
        const headers = new Headers(init?.headers);
        if (!headers.get('Authorization')) {
          return new Response('rate limited', { status: 403 });
        }
        return Response.json({ tag_name: 'bun-v1.3.14' });
      },
    });
    expect(calls).toBe(2);
    expect(res.authSource).toBe('GITHUB_TOKEN');
    expect(res.resolvedVersion).toBe('1.3.14');
  });

  test('probeChannelAuth reports invalid token', async () => {
    const { probeChannelAuth } = await import('../lib/verification/channels.ts');
    const status = await probeChannelAuth({
      allowGhCli: false,
      env: { GITHUB_TOKEN: 'bad' },
      fetchImpl: async () => new Response('unauthorized', { status: 401 }),
    });
    expect(status.configured).toBe(true);
    expect(status.valid).toBe(false);
    expect(status.message).toMatch(/401|refresh/);
  });

  test('buildSemanticTags includes provenanceId and resolve audit fields', async () => {
    const tags = await buildSemanticTags('runtime', {
      runtimeVersion: Bun.version,
      testedAt: '2026-07-23T12:00:00.000Z',
      testSuiteCommit: 'abc123def456',
      provenanceId: 'test-run-1',
      allowGhCli: false,
      env: {},
      fetchImpl: async () =>
        Response.json({
          tag_name: 'bun-v1.3.14',
          name: 'Bun v1.3.14',
        }),
    });
    expect(tags.provenanceId).toBe('test-run-1');
    expect(tags.testedAt).toBe('2026-07-23T12:00:00.000Z');
    expect(tags.testSuiteCommit).toBe('abc123def456');
    expect(tags.runtimeVersion).toBe(Bun.version);
    expect(tags.latestAtTestTime).toBeDefined();
    expect(tags.channelResolveSource).toBe('runtime');
  });

  test('resolveProvenanceId prefers CI env', () => {
    const prev = process.env.GITHUB_RUN_ID;
    process.env.GITHUB_RUN_ID = '999';
    expect(resolveProvenanceId('2026-07-23T12:00:00.000Z')).toBe('999');
    if (prev === undefined) delete process.env.GITHUB_RUN_ID;
    else process.env.GITHUB_RUN_ID = prev;
  });

  test('resolveGithubAuthToken precedence GITHUB_TOKEN > ACCESS > GH_TOKEN > gh-cli', () => {
    expect(
      resolveGithubAuthToken(
        {
          GITHUB_TOKEN: 'tok-a',
          GITHUB_ACCESS_TOKEN: 'tok-b',
          GH_TOKEN: 'tok-c',
        },
        { allowGhCli: false }
      )
    ).toBe('tok-a');
    expect(
      resolveGithubAuthToken(
        { GITHUB_ACCESS_TOKEN: 'tok-b', GH_TOKEN: 'tok-c' },
        { allowGhCli: false }
      )
    ).toBe('tok-b');
    expect(resolveGithubAuthToken({ GH_TOKEN: 'tok-c' }, { allowGhCli: false })).toBe('tok-c');
    expect(resolveGithubAuthToken({}, { allowGhCli: false })).toBeUndefined();
    expect(
      resolveGithubAuth({
        env: {},
        allowGhCli: true,
        ghTokenReader: () => 'from-gh',
      })
    ).toEqual({
      token: 'from-gh',
      source: 'gh-cli',
      apiDomain: 'api.github.com',
    });
  });

  test('describeChannelAuth is secret-safe', () => {
    const d = describeChannelAuth({
      env: { GITHUB_ACCESS_TOKEN: 'secret-value-should-not-leak' },
      allowGhCli: false,
    });
    expect(d.source).toBe('GITHUB_ACCESS_TOKEN');
    expect(d.configured).toBe(true);
    expect(JSON.stringify(d)).not.toContain('secret-value');
  });

  test('verificationSnapshotFilename sanitizes channel and version', () => {
    const path = verificationSnapshotFilename({
      channel: 'canary',
      targetVersion: '1.4.0-canary.1',
      provenanceId: 'x',
      testedAt: 't',
      runtimeVersion: '1.4.0-canary.1',
    } as SemanticTags);
    expect(path).toBe('public/registry/verification-canary-1.4.0-canary.1.json');
  });

  test('verificationSnapshotFilename replaces + in canary versions', () => {
    const path = verificationSnapshotFilename({
      channel: 'canary',
      targetVersion: 'canary+abcdef012345',
      provenanceId: 'x',
      testedAt: 't',
      runtimeVersion: '1.4.0',
    } as SemanticTags);
    expect(path).toBe('public/registry/verification-canary-canary-abcdef012345.json');
  });

  test('verificationSnapshotFilename appends suite suffix for bundler', () => {
    const tags = {
      channel: 'stable',
      targetVersion: '1.4.0',
      provenanceId: 'x',
      testedAt: 't',
      runtimeVersion: '1.4.0',
    } as SemanticTags;
    expect(verificationSnapshotFilename(tags, 'bundler')).toBe(
      'public/registry/verification-stable-1.4.0-bundler.json'
    );
  });
});

describe('lib/verification/proof-diff', () => {
  function proof(
    partial: Partial<ChannelAwareVerificationReport> & {
      results: VerificationResult[];
      semanticTags: SemanticTags;
    }
  ): ChannelAwareVerificationReport {
    const passed = partial.results.filter(r => r.passed).length;
    return {
      type: 'ChannelAwareVerificationReport',
      version: '1.0.0',
      timestamp: 't',
      bunVersion: '1.4.0',
      bunRevision: 'abc',
      proofHash: partial.proofHash ?? 'hash-a',
      summary: {
        passed,
        total: partial.results.length,
        status: passed === partial.results.length ? 'pass' : 'fail',
      },
      ...partial,
    };
  }

  test('diffChannelProofs detects pass flips and additions', () => {
    const before = proof({
      proofHash: 'aaa',
      semanticTags: {
        channel: 'stable',
        targetVersion: '1.4.0',
        provenanceId: 'a',
        testedAt: 't',
        runtimeVersion: '1.4.0',
      },
      results: [
        { name: 'tls', expected: 'ok', actual: 'ok', passed: true },
        { name: 'old', expected: 'x', actual: 'x', passed: true },
      ],
    });
    const after = proof({
      proofHash: 'bbb',
      semanticTags: {
        channel: 'pinned',
        targetVersion: '1.3.14',
        provenanceId: 'b',
        testedAt: 't',
        runtimeVersion: '1.4.0',
      },
      results: [
        { name: 'tls', expected: 'ok', actual: 'fail', passed: false },
        { name: 'new', expected: 'y', actual: 'y', passed: true },
      ],
    });
    const diff = diffChannelProofs(before, after);
    expect(diff.summary.passFlipped).toBe(1);
    expect(diff.summary.added).toBe(1);
    expect(diff.summary.removed).toBe(1);
    expect(diff.summary.proofHashChanged).toBe(true);
    const lines = formatProofDiffSummary(diff);
    expect(lines.some(l => l.includes('PASS FLIPS'))).toBe(true);
    expect(lines.some(l => l.includes('tls') && l.includes('pass') && l.includes('FAIL'))).toBe(
      true
    );
    expect(lines.some(l => l.includes('ADDED'))).toBe(true);
    expect(lines.some(l => l.includes('REMOVED'))).toBe(true);
  });

  test('formatProofDiffSummary shows value drifts in a table', () => {
    const before = proof({
      proofHash: 'aaa',
      semanticTags: {
        channel: 'stable',
        targetVersion: '1.4.0',
        provenanceId: 'a',
        testedAt: 't',
        runtimeVersion: '1.4.0',
      },
      results: [{ name: 'escapeHTML', expected: '< 500 ns', actual: '133.5 ns', passed: true }],
    });
    const after = proof({
      proofHash: 'bbb',
      semanticTags: {
        channel: 'pinned',
        targetVersion: '1.3.14',
        provenanceId: 'b',
        testedAt: 't',
        runtimeVersion: '1.4.0',
      },
      results: [{ name: 'escapeHTML', expected: '< 500 ns', actual: '111.6 ns', passed: true }],
    });
    const lines = formatProofDiffSummary(diffChannelProofs(before, after));
    expect(lines.some(l => l.includes('VALUE DRIFTS'))).toBe(true);
    expect(lines.some(l => l.includes('133.5 ns') && l.includes('111.6 ns'))).toBe(true);
  });

  test('formatProofDiffSummary columns use visible width (ANSI-safe pad)', () => {
    const colored = `${Bun.color('cyan', 'ansi') ?? ''}escapeHTML\x1b[0m`;
    const before = proof({
      proofHash: 'aaa',
      semanticTags: {
        channel: 'stable',
        targetVersion: '1.4.0',
        provenanceId: 'a',
        testedAt: 't',
        runtimeVersion: '1.4.0',
      },
      results: [{ name: colored, expected: 'ok', actual: '133.5 ns', passed: true }],
    });
    const after = proof({
      proofHash: 'bbb',
      semanticTags: {
        channel: 'pinned',
        targetVersion: '1.3.14',
        provenanceId: 'b',
        testedAt: 't',
        runtimeVersion: '1.4.0',
      },
      results: [{ name: colored, expected: 'ok', actual: '111.6 ns', passed: true }],
    });
    const lines = formatProofDiffSummary(diffChannelProofs(before, after), {
      nameWidth: 20,
      cellWidth: 16,
    });
    const drift = lines.find(l => l.includes('133.5') && l.includes('111.6'));
    expect(drift).toBeDefined();
    // Leading indent (2) + name col (20) + gap (2) + before cell (16) ≥ layout
    expect(Bun.stringWidth(drift!.trimEnd())).toBeGreaterThanOrEqual(2 + 20 + 2 + 16);
  });
});

describe('lib/verification/jsonld', () => {
  test('generateJSONLD produces SoftwareApplication schema', () => {
    const tags: SemanticTags = {
      channel: 'runtime',
      targetVersion: '1.4.0',
      provenanceId: 'local',
      testedAt: '2026-07-23T12:00:00.000Z',
      runtimeVersion: '1.4.0-canary.1',
    };
    const results: VerificationResult[] = [
      { name: 'a', expected: 'x', actual: 'x', passed: true, canonical: 'https://example.com#a' },
      { name: 'b', expected: 'y', actual: 'n', passed: false },
    ];
    const ld = generateJSONLD(results, tags) as Record<string, unknown>;
    expect(ld['@type']).toBe('SoftwareApplication');
    expect(ld.applicationCategory).toBe('DeveloperApplication');
    expect(Array.isArray(ld.review)).toBe(true);
    expect((ld.review as unknown[]).length).toBe(2);
  });
});

describe('public/portal/verification-card.js', () => {
  test('renderVerificationArticle includes semantic data attributes', async () => {
    const mod = await import('../public/portal/verification-card.js');
    const html = mod.renderVerificationArticle(
      {
        name: 'tls probe',
        expected: 'ok',
        actual: 'ok',
        passed: true,
        canonical: 'https://bun.com/blog/bun-v1.3.14#event-loop-refactor',
        _links: {
          docs: 'https://bun.com/blog/bun-v1.3.14#event-loop-refactor',
          source: 'https://example.com/source',
          report: '/registry/release-features.json',
        },
      },
      {
        channel: 'canary',
        targetVersion: '1.4.0-canary.1',
        testedAt: '2026-07-23T12:00:00.000Z',
        provenanceId: 'local',
        runtimeVersion: '1.4.0-canary.1',
      }
    );
    expect(html).toContain('class="verification-result"');
    expect(html).toContain('data-channel="canary"');
    expect(html).toContain('<time datetime="2026-07-23T12:00:00.000Z"');
    expect(html).toContain('rel="help"');
  });
});
