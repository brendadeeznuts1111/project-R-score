/**
 * Repository SSOT for GitHub issue metadata.
 *
 * GitHub labels are a synchronized projection. Wire parsing lives in
 * `lib/github-issue-taxonomy-wire.ts`; this module owns only trusted domain
 * values, legal combinations, and deterministic label definitions.
 */

import {
  asGithubIssueArtifactId,
  asGithubIssueConceptId,
  asGithubIssueConcernCode,
  asGithubIssueDimensionCode,
  asGithubIssueLabelKey,
  asGithubIssueLabelNameKey,
  asGithubIssuePlaneCode,
  asGithubIssuePriorityCode,
  asGithubIssueRuntimeCode,
  asGithubIssueStatusCode,
  asGithubIssueTeamCode,
  asGithubIssueTypeCode,
  asGithubIssueUrgencyCode,
  type Brand,
  type GithubIssueArtifactId,
  type GithubIssueConceptId,
  type GithubIssueConcernCode,
  type GithubIssueDimensionCode,
  type GithubIssueLabelKey,
  type GithubIssueLabelNameKey,
  type GithubIssuePlaneCode,
  type GithubIssuePriorityCode,
  type GithubIssueRuntimeCode,
  type GithubIssueStatusCode,
  type GithubIssueTeamCode,
  type GithubIssueTypeCode,
  type GithubIssueUrgencyCode,
} from '../lib/types/branded.ts';
import {
  isPartnerOpsColorKey,
  type PartnerOpsColorKey,
} from '../lib/telegram/partner-ops-color-kernel.ts';

export const GITHUB_ISSUE_SPINE_SCHEMA = 'factorywager.issue-spine.v1' as const;
export const GITHUB_ISSUE_TAXONOMY_SCHEMA = 'factorywager.github-issue-taxonomy.v1' as const;
export const GITHUB_ISSUE_TAXONOMY_ARTIFACT_ID = asGithubIssueArtifactId('github-issue-taxonomy');
export const GITHUB_ISSUE_TAXONOMY_CONCEPT_ID = asGithubIssueConceptId('governance.issue_taxonomy');

/** GitHub assigns positive integer issue numbers; keep them nominal inside. */
export type GithubIssueNumber = Brand<number, 'GithubIssueNumber'>;

export function asGithubIssueNumber(value: number): GithubIssueNumber {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`GitHub issue number must be a positive safe integer: ${value}`);
  }
  return value as GithubIssueNumber;
}

export const GITHUB_ISSUE_DIMENSIONS = {
  type: asGithubIssueDimensionCode('type'),
  priority: asGithubIssueDimensionCode('priority'),
  plane: asGithubIssueDimensionCode('plane'),
  runtime: asGithubIssueDimensionCode('runtime'),
  team: asGithubIssueDimensionCode('team'),
  status: asGithubIssueDimensionCode('status'),
  urgency: asGithubIssueDimensionCode('urgency'),
  concern: asGithubIssueDimensionCode('concern'),
} as const;

export const GITHUB_ISSUE_TYPES = {
  bug: asGithubIssueTypeCode('bug'),
  enhancement: asGithubIssueTypeCode('enhancement'),
} as const;

export const GITHUB_ISSUE_PRIORITIES = {
  p0: asGithubIssuePriorityCode('p0'),
  p1: asGithubIssuePriorityCode('p1'),
  p2: asGithubIssuePriorityCode('p2'),
} as const;

export const GITHUB_ISSUE_PLANES = {
  governance: asGithubIssuePlaneCode('governance'),
  domain: asGithubIssuePlaneCode('domain'),
  local: asGithubIssuePlaneCode('local'),
  public: asGithubIssuePlaneCode('public'),
  portal: asGithubIssuePlaneCode('portal'),
} as const;

export const GITHUB_ISSUE_RUNTIMES = {
  bun: asGithubIssueRuntimeCode('bun'),
  agnostic: asGithubIssueRuntimeCode('agnostic'),
} as const;

export const GITHUB_ISSUE_TEAMS = {
  infrastructure: asGithubIssueTeamCode('infrastructure'),
} as const;

export const GITHUB_ISSUE_STATUSES = {
  planned: asGithubIssueStatusCode('planned'),
  active: asGithubIssueStatusCode('active'),
  blocked: asGithubIssueStatusCode('blocked'),
  done: asGithubIssueStatusCode('done'),
} as const;

export const GITHUB_ISSUE_URGENCIES = {
  high: asGithubIssueUrgencyCode('high'),
} as const;

export const GITHUB_ISSUE_CONCERNS = {
  resourceManagement: asGithubIssueConcernCode('resource-management'),
} as const;

export const GITHUB_ISSUE_REQUIRED_DIMENSIONS = [
  GITHUB_ISSUE_DIMENSIONS.type,
  GITHUB_ISSUE_DIMENSIONS.priority,
  GITHUB_ISSUE_DIMENSIONS.plane,
  GITHUB_ISSUE_DIMENSIONS.runtime,
  GITHUB_ISSUE_DIMENSIONS.team,
  GITHUB_ISSUE_DIMENSIONS.status,
] as const;

export const GITHUB_ISSUE_REQUIRED_VALUES = [
  [GITHUB_ISSUE_DIMENSIONS.type, Object.values(GITHUB_ISSUE_TYPES)],
  [GITHUB_ISSUE_DIMENSIONS.priority, Object.values(GITHUB_ISSUE_PRIORITIES)],
  [GITHUB_ISSUE_DIMENSIONS.plane, Object.values(GITHUB_ISSUE_PLANES)],
  [GITHUB_ISSUE_DIMENSIONS.runtime, Object.values(GITHUB_ISSUE_RUNTIMES)],
  [GITHUB_ISSUE_DIMENSIONS.team, Object.values(GITHUB_ISSUE_TEAMS)],
  [GITHUB_ISSUE_DIMENSIONS.status, Object.values(GITHUB_ISSUE_STATUSES)],
] as const;

export type GithubIssueLabelValue =
  | GithubIssueTypeCode
  | GithubIssuePriorityCode
  | GithubIssuePlaneCode
  | GithubIssueRuntimeCode
  | GithubIssueTeamCode
  | GithubIssueStatusCode
  | GithubIssueUrgencyCode
  | GithubIssueConcernCode;

export type GithubIssueLabelDefinition = {
  readonly key: GithubIssueLabelKey;
  readonly dimension: GithubIssueDimensionCode;
  readonly value: GithubIssueLabelValue;
  readonly githubName: GithubIssueLabelNameKey;
  readonly githubDescription: string;
  /** Six-digit GitHub provider hex, without a leading hash. */
  readonly githubColor: string;
  readonly colorKey: PartnerOpsColorKey;
};

function defineLabel(
  dimension: GithubIssueDimensionCode,
  value: GithubIssueLabelValue,
  githubName: GithubIssueLabelNameKey,
  githubDescription: string,
  githubColor: string,
  colorKey: PartnerOpsColorKey
): GithubIssueLabelDefinition {
  return {
    key: asGithubIssueLabelKey(`${dimension}.${value}`),
    dimension,
    value,
    githubName,
    githubDescription,
    githubColor,
    colorKey,
  };
}

const labelName = asGithubIssueLabelNameKey;

export const GITHUB_ISSUE_LABELS = [
  defineLabel(
    GITHUB_ISSUE_DIMENSIONS.type,
    GITHUB_ISSUE_TYPES.bug,
    labelName('bug'),
    "Something isn't working",
    'd73a4a',
    'trading'
  ),
  defineLabel(
    GITHUB_ISSUE_DIMENSIONS.type,
    GITHUB_ISSUE_TYPES.enhancement,
    labelName('enhancement'),
    'New feature or request',
    'a2eeef',
    'tennis'
  ),
  defineLabel(
    GITHUB_ISSUE_DIMENSIONS.priority,
    GITHUB_ISSUE_PRIORITIES.p0,
    labelName('p0'),
    'Priority 0 incident or release blocker',
    'f85149',
    'trading'
  ),
  defineLabel(
    GITHUB_ISSUE_DIMENSIONS.priority,
    GITHUB_ISSUE_PRIORITIES.p1,
    labelName('p1'),
    'Priority 1 work',
    'bfdadc',
    'middleware'
  ),
  defineLabel(
    GITHUB_ISSUE_DIMENSIONS.priority,
    GITHUB_ISSUE_PRIORITIES.p2,
    labelName('p2'),
    'Priority 2 work',
    '8b949e',
    'env'
  ),
  ...Object.entries(GITHUB_ISSUE_PLANES).map(([name, value]) =>
    defineLabel(
      GITHUB_ISSUE_DIMENSIONS.plane,
      value,
      labelName(`plane-${name}`),
      `${name} ownership plane`,
      name === 'portal' ? '3fb950' : name === 'public' ? '1f6feb' : 'd29922',
      name === 'portal' ? 'tennis' : name === 'public' ? 'polymarket' : 'middleware'
    )
  ),
  defineLabel(
    GITHUB_ISSUE_DIMENSIONS.runtime,
    GITHUB_ISSUE_RUNTIMES.bun,
    labelName('bun-native'),
    'Issues related to Bun native APIs and patterns',
    '0969da',
    'kalshi'
  ),
  defineLabel(
    GITHUB_ISSUE_DIMENSIONS.runtime,
    GITHUB_ISSUE_RUNTIMES.agnostic,
    labelName('runtime-agnostic'),
    'Work with no runtime-specific contract',
    '8b949e',
    'env'
  ),
  defineLabel(
    GITHUB_ISSUE_DIMENSIONS.team,
    GITHUB_ISSUE_TEAMS.infrastructure,
    labelName('team-infrastructure'),
    'Issues assigned to infrastructure team',
    'd1242f',
    'trading'
  ),
  ...Object.entries(GITHUB_ISSUE_STATUSES).map(([name, value]) =>
    defineLabel(
      GITHUB_ISSUE_DIMENSIONS.status,
      value,
      labelName(`status-${name}`),
      `Issue lifecycle status: ${name}`,
      name === 'done' ? '3fb950' : name === 'blocked' ? 'f85149' : 'd29922',
      name === 'done' ? 'tennis' : name === 'blocked' ? 'trading' : 'middleware'
    )
  ),
  defineLabel(
    GITHUB_ISSUE_DIMENSIONS.urgency,
    GITHUB_ISSUE_URGENCIES.high,
    labelName('high-priority'),
    'High priority issues requiring prompt attention',
    'ff6b00',
    'research'
  ),
  defineLabel(
    GITHUB_ISSUE_DIMENSIONS.concern,
    GITHUB_ISSUE_CONCERNS.resourceManagement,
    labelName('resource-management'),
    'Resource management and memory leak issues',
    'fb850f',
    'research'
  ),
] as const satisfies readonly GithubIssueLabelDefinition[];

export type GithubIssueSpine = {
  readonly schema: typeof GITHUB_ISSUE_SPINE_SCHEMA;
  readonly issueNumber: GithubIssueNumber;
  readonly artifactId: GithubIssueArtifactId;
  readonly conceptId?: GithubIssueConceptId;
  readonly type: GithubIssueTypeCode;
  readonly priority: GithubIssuePriorityCode;
  readonly plane: GithubIssuePlaneCode;
  readonly runtime: GithubIssueRuntimeCode;
  readonly team: GithubIssueTeamCode;
  readonly status: GithubIssueStatusCode;
};

function assertUnique(values: readonly string[], field: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`GitHub issue taxonomy has duplicate ${field}`);
  }
}

export function assertGithubIssueTaxonomy(
  labels: readonly GithubIssueLabelDefinition[] = GITHUB_ISSUE_LABELS
): void {
  assertUnique(
    labels.map(row => row.key),
    'label key'
  );
  assertUnique(
    labels.map(row => row.githubName),
    'GitHub label name'
  );
  assertUnique(
    labels.map(row => `${row.dimension}.${row.value}`),
    'dimension/value pair'
  );

  for (const row of labels) {
    if (row.key !== `${row.dimension}.${row.value}`) {
      throw new Error(`GitHub issue label key disagrees with its dimension/value: ${row.key}`);
    }
    if (!/^[0-9a-f]{6}$/i.test(row.githubColor)) {
      throw new Error(`GitHub issue label has invalid hex: ${row.key}`);
    }
    if (!isPartnerOpsColorKey(row.colorKey)) {
      throw new Error(`GitHub issue label has unknown color key: ${row.key}`);
    }
  }

  for (const [dimension, values] of GITHUB_ISSUE_REQUIRED_VALUES) {
    for (const value of values) {
      if (!labels.some(row => row.dimension === dimension && row.value === value)) {
        throw new Error(
          `GitHub issue taxonomy has no label for required value: ${dimension}.${value}`
        );
      }
    }
  }
}

export function assertGithubIssueSpine(spine: GithubIssueSpine): void {
  if (
    spine.type === GITHUB_ISSUE_TYPES.enhancement &&
    spine.priority === GITHUB_ISSUE_PRIORITIES.p0
  ) {
    throw new Error('GitHub issue taxonomy reserves p0 for bug/incident work');
  }
  if (spine.type === GITHUB_ISSUE_TYPES.bug && spine.status === GITHUB_ISSUE_STATUSES.planned) {
    throw new Error('GitHub issue taxonomy requires bugs to enter as active, blocked, or done');
  }
}

export function labelsForGithubIssueSpine(
  spine: GithubIssueSpine
): readonly GithubIssueLabelDefinition[] {
  const keys = new Set<GithubIssueLabelKey>([
    asGithubIssueLabelKey(`${GITHUB_ISSUE_DIMENSIONS.type}.${spine.type}`),
    asGithubIssueLabelKey(`${GITHUB_ISSUE_DIMENSIONS.priority}.${spine.priority}`),
    asGithubIssueLabelKey(`${GITHUB_ISSUE_DIMENSIONS.plane}.${spine.plane}`),
    asGithubIssueLabelKey(`${GITHUB_ISSUE_DIMENSIONS.runtime}.${spine.runtime}`),
    asGithubIssueLabelKey(`${GITHUB_ISSUE_DIMENSIONS.team}.${spine.team}`),
    asGithubIssueLabelKey(`${GITHUB_ISSUE_DIMENSIONS.status}.${spine.status}`),
  ]);
  return GITHUB_ISSUE_LABELS.filter(row => keys.has(row.key));
}

assertGithubIssueTaxonomy();
