// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
/** Unknown-input verifier for the public GitHub issue taxonomy projection. */

import { GITHUB_ISSUE_LABELS } from '../config/github-issue-taxonomy.ts';
import {
  buildGithubIssueTaxonomyPublicArtifact,
  type GithubIssueTaxonomyPublicArtifact,
} from './github-issue-taxonomy-public.ts';
import { isPartnerOpsColorKey, partnerOpsColorWire } from './telegram/partner-ops-color-kernel.ts';

function record(value: unknown, context: string): Record<string, unknown> {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${context} must be an object`);
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, context: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${context} must be a non-empty string`);
  }
  return value;
}

function rows(value: unknown, context: string): unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${context} must be an array`);
  return value;
}

function assertUnique(values: readonly string[], context: string): void {
  if (new Set(values).size !== values.length) {
    throw new TypeError(`${context} contains duplicate values`);
  }
}

/**
 * Verify shape, uniqueness, color resolution, and exact SSOT parity before a
 * public artifact is trusted by registry or portal consumers.
 */
export function parseGithubIssueTaxonomyPublicArtifact(
  value: unknown
): GithubIssueTaxonomyPublicArtifact {
  const artifact = record(value, 'GitHub issue taxonomy public artifact');
  const dimensions = rows(artifact.dimensions, 'taxonomy dimensions').map((value, index) => {
    const row = record(value, `taxonomy dimension ${index}`);
    const key = string(row.key, `taxonomy dimension ${index} key`);
    const values = rows(row.values, `taxonomy dimension ${key} values`).map((entry, valueIndex) =>
      string(entry, `taxonomy dimension ${key} value ${valueIndex}`)
    );
    assertUnique(values, `taxonomy dimension ${key}`);
    return key;
  });
  assertUnique(dimensions, 'taxonomy dimensions');

  const known = new Set<string>(GITHUB_ISSUE_LABELS.map(label => label.key));
  const labelRows = rows(artifact.labels, 'taxonomy labels');
  const labelKeys: string[] = [];
  const labelNames: string[] = [];
  const dimensionValues: string[] = [];
  for (const [index, value] of labelRows.entries()) {
    const row = record(value, `taxonomy label ${index}`);
    const key = string(row.key, `taxonomy label ${index} key`);
    const dimension = string(row.dimension, `taxonomy label ${key} dimension`);
    const semanticValue = string(row.value, `taxonomy label ${key} value`);
    if (!known.has(key)) {
      throw new TypeError(`taxonomy label ${key} is not resolvable from the repository SSOT`);
    }
    const github = record(row.github, `taxonomy label ${key} GitHub projection`);
    const name = string(github.name, `taxonomy label ${key} GitHub name`);
    const hex = string(github.hex, `taxonomy label ${key} GitHub hex`);
    if (!/^[0-9a-f]{6}$/.test(hex)) {
      throw new TypeError(`taxonomy label ${key} has invalid GitHub hex`);
    }
    const color = record(row.color, `taxonomy label ${key} color`);
    const colorKey = string(color.colorKey, `taxonomy label ${key} colorKey`);
    if (!isPartnerOpsColorKey(colorKey)) {
      throw new TypeError(`taxonomy label ${key} has unresolvable colorKey ${colorKey}`);
    }
    if (!Bun.deepEquals(color, partnerOpsColorWire(colorKey), true)) {
      throw new TypeError(`taxonomy label ${key} color projection is stale`);
    }
    labelKeys.push(key);
    labelNames.push(name);
    dimensionValues.push(`${dimension}.${semanticValue}`);
  }
  assertUnique(labelKeys, 'taxonomy label keys');
  assertUnique(labelNames, 'taxonomy GitHub label names');
  assertUnique(dimensionValues, 'taxonomy dimension/value pairs');

  const expected = buildGithubIssueTaxonomyPublicArtifact();
  if (!Bun.deepEquals(artifact, expected, true)) {
    throw new TypeError('GitHub issue taxonomy public artifact is stale or malformed');
  }
  return artifact as GithubIssueTaxonomyPublicArtifact;
}
