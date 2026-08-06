/**
 * Parse-once boundary for `factorywager.issue-spine.v1` metadata.
 *
 * Unknown GitHub API / issue-form payloads stop here. Interior consumers
 * receive a branded `GithubIssueSpine` and never re-decode it.
 */

import {
  GITHUB_ISSUE_SPINE_SCHEMA,
  asGithubIssueNumber,
  assertGithubIssueSpine,
  type GithubIssueSpine,
} from '../config/github-issue-taxonomy.ts';
import {
  parseGithubIssueArtifactId,
  parseGithubIssueConceptId,
  parseGithubIssuePlaneCode,
  parseGithubIssuePriorityCode,
  parseGithubIssueRuntimeCode,
  parseGithubIssueStatusCode,
  parseGithubIssueTeamCode,
  parseGithubIssueTypeCode,
  unbrand,
} from './types/branded.ts';

function parseRecord(value: unknown): Record<string, unknown> {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('GitHub issue spine must be an object');
  }
  return value as Record<string, unknown>;
}

export function parseGithubIssueNumber(value: unknown) {
  if (typeof value !== 'number') {
    throw new TypeError('GitHub issue number must be a number');
  }
  return asGithubIssueNumber(value);
}

export function parseGithubIssueSpine(value: unknown): GithubIssueSpine {
  const row = parseRecord(value);
  if (row.schema !== GITHUB_ISSUE_SPINE_SCHEMA) {
    throw new TypeError(`Unsupported GitHub issue spine schema: ${String(row.schema)}`);
  }

  const spine: GithubIssueSpine = {
    schema: GITHUB_ISSUE_SPINE_SCHEMA,
    issueNumber: parseGithubIssueNumber(row.issueNumber),
    artifactId: parseGithubIssueArtifactId(row.artifactId),
    ...(row.conceptId == null ? {} : { conceptId: parseGithubIssueConceptId(row.conceptId) }),
    type: parseGithubIssueTypeCode(row.type),
    priority: parseGithubIssuePriorityCode(row.priority),
    plane: parseGithubIssuePlaneCode(row.plane),
    runtime: parseGithubIssueRuntimeCode(row.runtime),
    team: parseGithubIssueTeamCode(row.team),
    status: parseGithubIssueStatusCode(row.status),
  };
  assertGithubIssueSpine(spine);
  return spine;
}

export type GithubIssueSpineWire = {
  readonly schema: typeof GITHUB_ISSUE_SPINE_SCHEMA;
  readonly issueNumber: number;
  readonly artifactId: string; // brand-ok — serialized GithubIssueArtifactId at outbound wire edge
  readonly conceptId?: string; // brand-ok — serialized GithubIssueConceptId at outbound wire edge
  readonly type: string;
  readonly priority: string;
  readonly plane: string;
  readonly runtime: string;
  readonly team: string;
  readonly status: string;
};

export function githubIssueSpineToWire(spine: GithubIssueSpine): GithubIssueSpineWire {
  return {
    schema: spine.schema,
    issueNumber: spine.issueNumber,
    artifactId: unbrand(spine.artifactId),
    ...(spine.conceptId == null ? {} : { conceptId: unbrand(spine.conceptId) }),
    type: unbrand(spine.type),
    priority: unbrand(spine.priority),
    plane: unbrand(spine.plane),
    runtime: unbrand(spine.runtime),
    team: unbrand(spine.team),
    status: unbrand(spine.status),
  };
}
