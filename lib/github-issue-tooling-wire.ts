/**
 * GitHub Issues wire boundary.
 *
 * Provider JSON and machine-readable issue-body metadata stop here. Interior
 * audit code receives a parsed `GithubIssueSpine` plus bounded provider fields.
 */

import {
  GITHUB_ISSUE_DIMENSIONS,
  GITHUB_ISSUE_LABELS,
  GITHUB_ISSUE_REQUIRED_DIMENSIONS,
  GITHUB_ISSUE_SPINE_SCHEMA,
  type GithubIssueSpine,
} from '../config/github-issue-taxonomy.ts';
import { parseGithubIssueSpine } from './github-issue-taxonomy-wire.ts';

export type GithubProviderIssue = {
  readonly number: number;
  readonly title: string;
  readonly body: string;
  readonly labelNames: readonly string[]; // brand-ok — observed provider labels may be outside taxonomy
};

export type GithubProviderLabel = {
  readonly name: string; // brand-ok — observed provider label, parsed against taxonomy later
  readonly description: string;
  readonly color: string;
};

export type ParsedGithubProviderIssue = {
  readonly provider: GithubProviderIssue;
  readonly spine: GithubIssueSpine;
  readonly bodyFields: ReadonlySet<string>;
};

function parseRecord(value: unknown, context: string): Record<string, unknown> {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${context} must be an object`);
  }
  return value as Record<string, unknown>;
}

function parseString(value: unknown, context: string): string {
  if (typeof value !== 'string') throw new TypeError(`${context} must be a string`);
  return value;
}

function parseIssueNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError('GitHub issue number must be a positive safe integer');
  }
  return value;
}

function parseProviderLabelName(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  const row = parseRecord(value, 'GitHub issue label');
  const name = parseString(row.name, 'GitHub issue label name').trim();
  if (!name) throw new TypeError('GitHub issue label name must not be blank');
  return name;
}

export function parseGithubProviderIssue(value: unknown): GithubProviderIssue {
  const row = parseRecord(value, 'GitHub issue');
  if (!Array.isArray(row.labels)) throw new TypeError('GitHub issue labels must be an array');
  return {
    number: parseIssueNumber(row.number),
    title: parseString(row.title, 'GitHub issue title'),
    body: row.body == null ? '' : parseString(row.body, 'GitHub issue body'),
    labelNames: row.labels.map(parseProviderLabelName),
  };
}

export function parseGithubProviderLabel(value: unknown): GithubProviderLabel {
  const row = parseRecord(value, 'GitHub repository label');
  return {
    name: parseProviderLabelName(row.name),
    description: row.description == null ? '' : parseString(row.description, 'label description'),
    color: parseString(row.color, 'label color').toLowerCase(),
  };
}

const HTML_SPINE_RE = /<!--\s*factorywager\.issue-spine\.v1\s*(\{[\s\S]*?\})\s*-->/i;
const FENCED_SPINE_RE =
  /###\s+Machine-readable issue spine\s*\r?\n+```(?:json)?\s*\r?\n([\s\S]*?)\r?\n```/i;

export function extractGithubIssueSpineJson(body: string): string {
  const html = HTML_SPINE_RE.exec(body)?.[1];
  if (html) return html.trim();
  const fenced = FENCED_SPINE_RE.exec(body)?.[1];
  if (fenced) return fenced.trim();
  throw new TypeError('GitHub issue body is missing a machine-readable issue spine');
}

function labelValueForDimension(
  labelNames: readonly string[],
  dimension: (typeof GITHUB_ISSUE_REQUIRED_DIMENSIONS)[number]
): string | undefined {
  const matches = GITHUB_ISSUE_LABELS.filter(
    label => label.dimension === dimension && labelNames.includes(label.githubName)
  );
  if (matches.length > 1) {
    throw new TypeError(`GitHub issue has multiple ${dimension} labels`);
  }
  return matches[0]?.value;
}

/** Parse an already-decoded provider issue + body block into the trusted issue spine. */
export function parseGithubIssueSpineFromProvider(
  provider: GithubProviderIssue
): ParsedGithubProviderIssue {
  let metadata: Record<string, unknown>;
  try {
    metadata = parseRecord(JSON.parse(extractGithubIssueSpineJson(provider.body)), 'issue spine');
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('machine-readable issue spine')) {
      throw error;
    }
    throw new TypeError(`GitHub issue #${provider.number} has invalid issue-spine JSON`, {
      cause: error,
    });
  }

  if (metadata.issueNumber != null && metadata.issueNumber !== provider.number) {
    throw new TypeError(
      `GitHub issue spine number disagrees with provider issue #${provider.number}`
    );
  }
  if (metadata.schema != null && metadata.schema !== GITHUB_ISSUE_SPINE_SCHEMA) {
    throw new TypeError(`Unsupported GitHub issue spine schema: ${String(metadata.schema)}`);
  }

  const fromBodyOrLabel = (field: keyof typeof GITHUB_ISSUE_DIMENSIONS) =>
    metadata[field] ?? labelValueForDimension(provider.labelNames, GITHUB_ISSUE_DIMENSIONS[field]);

  const spine = parseGithubIssueSpine({
    schema: GITHUB_ISSUE_SPINE_SCHEMA,
    issueNumber: provider.number,
    artifactId: metadata.artifactId,
    ...(metadata.conceptId == null ? {} : { conceptId: metadata.conceptId }),
    type: fromBodyOrLabel('type'),
    priority: fromBodyOrLabel('priority'),
    plane: fromBodyOrLabel('plane'),
    runtime: fromBodyOrLabel('runtime'),
    team: fromBodyOrLabel('team'),
    status: fromBodyOrLabel('status'),
  });

  return { provider, spine, bodyFields: new Set(Object.keys(metadata)) };
}

/** One-call boundary for raw GitHub API issue JSON. */
export function parseGithubProviderIssueSpine(value: unknown): ParsedGithubProviderIssue {
  return parseGithubIssueSpineFromProvider(parseGithubProviderIssue(value));
}
