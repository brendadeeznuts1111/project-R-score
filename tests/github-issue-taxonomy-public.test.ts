// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

import {
  GITHUB_ISSUE_TAXONOMY_PUBLIC_PATH,
  buildGithubIssueTaxonomyPublicArtifact,
  serializeGithubIssueTaxonomyPublicArtifact,
} from '../lib/github-issue-taxonomy-public.ts';
import { parseGithubIssueTaxonomyPublicArtifact } from '../lib/github-issue-taxonomy-public-wire.ts';
import { PORTAL_WEAVE_ARTIFACTS, PORTAL_WEAVE_SCRIPTS } from '../lib/http/portal-weave.ts';
import { BAKE_MANIFEST_PRIORITY_PATHS } from '../lib/registry/bake-manifest.ts';

describe('GitHub issue taxonomy public registry', () => {
  test('build is byte-deterministic and carries public-safe provenance', () => {
    const first = buildGithubIssueTaxonomyPublicArtifact();
    const second = buildGithubIssueTaxonomyPublicArtifact();
    expect(serializeGithubIssueTaxonomyPublicArtifact(first)).toBe(
      serializeGithubIssueTaxonomyPublicArtifact(second)
    );
    expect(first.artifactId).toBe('github-issue-taxonomy');
    expect(first.conceptId).toBe('registry.github_issue_taxonomy');
    expect(first.color.token).toBe('--partner-ops-middleware');
    expect(first.audit.ok).toBeTrue();
    expect(first.audit.sourceHash).toMatch(/^[0-9a-f]{64}$/);
    expect(first.provenance.sourceHash).toBe(first.audit.sourceHash);
    expect(JSON.stringify(first)).not.toMatch(
      /github_token|authorization|private issue body|\"body\"|secret/i
    );
  });

  test('dimensions and labels are complete, ordered, and color-resolvable', () => {
    const artifact = buildGithubIssueTaxonomyPublicArtifact();
    expect(artifact.dimensions.map(row => row.key)).toEqual([
      'type',
      'priority',
      'plane',
      'runtime',
      'team',
      'status',
      'urgency',
      'concern',
    ]);
    expect(artifact.audit.requiredDimensions).toBe(6);
    expect(artifact.labels.map(row => row.key)).toEqual(
      artifact.labels.map(row => row.key).toSorted()
    );
    expect(artifact.labels.every(row => /^[0-9a-f]{6}$/.test(row.github.hex))).toBeTrue();
    expect(artifact.labels.every(row => row.color.hex.startsWith('#'))).toBeTrue();
    expect(parseGithubIssueTaxonomyPublicArtifact(artifact)).toEqual(artifact);
  });

  test('verifier rejects duplicates, stale rows, and unresolvable colors', () => {
    const artifact = buildGithubIssueTaxonomyPublicArtifact();
    const duplicate = { ...artifact, labels: [...artifact.labels, artifact.labels[0]!] };
    expect(() => parseGithubIssueTaxonomyPublicArtifact(duplicate)).toThrow('duplicate');

    const stale = {
      ...artifact,
      labels: artifact.labels.map((row, index) =>
        index === 0 ? { ...row, github: { ...row.github, description: 'stale' } } : row
      ),
    };
    expect(() => parseGithubIssueTaxonomyPublicArtifact(stale)).toThrow('stale or malformed');

    const color = {
      ...artifact,
      labels: artifact.labels.map((row, index) =>
        index === 0 ? { ...row, color: { ...row.color, colorKey: 'not-a-color' } } : row
      ),
    };
    expect(() => parseGithubIssueTaxonomyPublicArtifact(color)).toThrow('unresolvable colorKey');
  });

  test('committed artifact and registry indexes match the SSOT', async () => {
    const expected = serializeGithubIssueTaxonomyPublicArtifact();
    const artifactFile = Bun.file(`public${GITHUB_ISSUE_TAXONOMY_PUBLIC_PATH}`);
    expect(await artifactFile.text()).toBe(expected);
    expect(
      PORTAL_WEAVE_ARTIFACTS.some(row => row.href === GITHUB_ISSUE_TAXONOMY_PUBLIC_PATH)
    ).toBeTrue();
    expect(
      PORTAL_WEAVE_SCRIPTS.some(row => row.cmd === 'bun run github-issue-taxonomy:check')
    ).toBeTrue();
    expect(BAKE_MANIFEST_PRIORITY_PATHS).toContain('github-issue-taxonomy.json');

    const manifest = (await Bun.file('public/registry/bake-manifest.json').json()) as {
      entries: Array<{ bytes: number; path: string }>;
    };
    const entry = manifest.entries.find(row => row.path === GITHUB_ISSUE_TAXONOMY_PUBLIC_PATH);
    expect(entry?.bytes).toBe(artifactFile.size);
  });
});
