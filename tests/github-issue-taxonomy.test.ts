// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

import {
  GITHUB_ISSUE_DIMENSIONS,
  GITHUB_ISSUE_LABELS,
  GITHUB_ISSUE_REQUIRED_DIMENSIONS,
  GITHUB_ISSUE_REQUIRED_VALUES,
  GITHUB_ISSUE_SPINE_SCHEMA,
  GITHUB_ISSUE_TAXONOMY_ARTIFACT_ID,
  GITHUB_ISSUE_TAXONOMY_CONCEPT_ID,
  assertGithubIssueTaxonomy,
  labelsForGithubIssueSpine,
} from '../config/github-issue-taxonomy.ts';
import {
  githubIssueSpineToWire,
  parseGithubIssueSpine,
} from '../lib/github-issue-taxonomy-wire.ts';
import {
  asGithubIssueConceptId,
  asGithubIssueLabelKey,
  parseGithubIssuePlaneCode,
} from '../lib/types/branded.ts';

const ISSUE_235_WIRE = {
  schema: GITHUB_ISSUE_SPINE_SCHEMA,
  issueNumber: 235,
  artifactId: 'boundary-fixtures',
  type: 'bug',
  priority: 'p1',
  plane: 'local',
  runtime: 'bun',
  team: 'infrastructure',
  status: 'active',
} as const;

const ISSUE_236_WIRE = {
  schema: GITHUB_ISSUE_SPINE_SCHEMA,
  issueNumber: 236,
  artifactId: 'ssot-flow-soft',
  conceptId: 'publish.ssot_flow_soft',
  type: 'bug',
  priority: 'p1',
  plane: 'local',
  runtime: 'bun',
  team: 'infrastructure',
  status: 'active',
} as const;

describe('GitHub issue taxonomy domain', () => {
  test('defines unique label projections for every required dimension', () => {
    expect(() => assertGithubIssueTaxonomy()).not.toThrow();
    expect(new Set(GITHUB_ISSUE_LABELS.map(row => row.key)).size).toBe(GITHUB_ISSUE_LABELS.length);
    expect(new Set(GITHUB_ISSUE_LABELS.map(row => row.githubName)).size).toBe(
      GITHUB_ISSUE_LABELS.length
    );
    for (const dimension of GITHUB_ISSUE_REQUIRED_DIMENSIONS) {
      expect(
        GITHUB_ISSUE_LABELS.some(row => row.dimension === dimension),
        dimension
      ).toBeTrue();
    }
    for (const [dimension, values] of GITHUB_ISSUE_REQUIRED_VALUES) {
      for (const value of values) {
        expect(
          GITHUB_ISSUE_LABELS.some(row => row.dimension === dimension && row.value === value),
          `${dimension}.${value}`
        ).toBeTrue();
      }
    }
    expect(GITHUB_ISSUE_DIMENSIONS.urgency).toBe('urgency');
    expect(GITHUB_ISSUE_DIMENSIONS.concern).toBe('concern');
    expect(GITHUB_ISSUE_TAXONOMY_ARTIFACT_ID).toBe('github-issue-taxonomy');
    expect(GITHUB_ISSUE_TAXONOMY_CONCEPT_ID).toBe('governance.issue_taxonomy');
  });

  test('parses and round-trips the #235 and #236 migration fixtures', () => {
    for (const wire of [ISSUE_235_WIRE, ISSUE_236_WIRE]) {
      const parsed = parseGithubIssueSpine(wire);
      expect(parsed.issueNumber).toBe(wire.issueNumber);
      expect(githubIssueSpineToWire(parsed)).toEqual(wire);
      const labels = labelsForGithubIssueSpine(parsed);
      expect(labels).toHaveLength(GITHUB_ISSUE_REQUIRED_DIMENSIONS.length);
      expect(labels.map(row => row.key).sort()).toEqual(
        [
          `type.${wire.type}`,
          `priority.${wire.priority}`,
          `plane.${wire.plane}`,
          `runtime.${wire.runtime}`,
          `team.${wire.team}`,
          `status.${wire.status}`,
        ].sort()
      );
      expect(labels.map(row => row.githubName)).toContain('p1');
      expect(labels.map(row => row.githubName)).toContain('team-infrastructure');
    }
  });

  test('keeps optional concept identity distinct from artifact identity', () => {
    const parsed = parseGithubIssueSpine(ISSUE_236_WIRE);
    expect(parsed.artifactId).toBe('ssot-flow-soft');
    expect(parsed.conceptId).toBe('publish.ssot_flow_soft');
    expect(asGithubIssueConceptId('publish.ssot_flow_soft')).toBe(parsed.conceptId);
    expect(asGithubIssueConceptId('section.accountLimitControl')).toBe(
      'section.accountLimitControl'
    );
    expect(asGithubIssueConceptId('spreadCents')).toBe('spreadCents');
    expect(() => asGithubIssueConceptId('not-a-concept')).toThrow();
    expect(() => asGithubIssueLabelKey('p1')).toThrow();
    expect(() => parseGithubIssuePlaneCode('unknown')).toThrow();
  });

  test('accepts every canonical domain-glossary concept identity', async () => {
    const glossary = (await Bun.file('public/registry/domain-glossary.json').json()) as {
      concepts: Array<{
        id: string; // brand-ok — canonical glossary wire value parsed below
      }>;
    };
    expect(glossary.concepts).not.toHaveLength(0);
    for (const concept of glossary.concepts) {
      expect(() => asGithubIssueConceptId(concept.id), concept.id).not.toThrow();
    }
  });

  test('rejects malformed wire values before they enter the interior', () => {
    expect(() => parseGithubIssueSpine({ ...ISSUE_235_WIRE, issueNumber: 0 })).toThrow();
    expect(() => parseGithubIssueSpine({ ...ISSUE_235_WIRE, schema: 'v0' })).toThrow();
    expect(() => parseGithubIssueSpine({ ...ISSUE_235_WIRE, priority: 'urgent' })).toThrow();
    expect(() => parseGithubIssueSpine({ ...ISSUE_235_WIRE, plane: 'cloud' })).toThrow();
  });

  test('rejects illegal cross-dimension combinations deterministically', () => {
    expect(() =>
      parseGithubIssueSpine({
        ...ISSUE_235_WIRE,
        type: 'enhancement',
        priority: 'p0',
        status: 'active',
      })
    ).toThrow('reserves p0 for bug/incident work');
    expect(() =>
      parseGithubIssueSpine({ ...ISSUE_235_WIRE, type: 'bug', status: 'planned' })
    ).toThrow('requires bugs to enter as active, blocked, or done');
  });

  test('taxonomy validation rejects duplicate provider names and invalid colors', () => {
    expect(GITHUB_ISSUE_LABELS.every(row => /^[0-9a-f]{6}$/i.test(row.githubColor))).toBeTrue();
    expect(GITHUB_ISSUE_LABELS[0]?.githubColor).toBe('d73a4a');

    const duplicate = [GITHUB_ISSUE_LABELS[0]!, GITHUB_ISSUE_LABELS[0]!];
    expect(() => assertGithubIssueTaxonomy(duplicate)).toThrow('duplicate label key');

    const invalidColor = [
      {
        ...GITHUB_ISSUE_LABELS[0]!,
        githubColor: '#d73a4a',
      },
    ];
    expect(() => assertGithubIssueTaxonomy(invalidColor)).toThrow('invalid hex');
  });
});
