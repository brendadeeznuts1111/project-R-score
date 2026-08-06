// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
/** Deterministic public projection of the repository-owned GitHub issue taxonomy. */

import {
  GITHUB_ISSUE_DIMENSIONS,
  GITHUB_ISSUE_LABELS,
  GITHUB_ISSUE_REQUIRED_DIMENSIONS,
  GITHUB_ISSUE_TAXONOMY_ARTIFACT_ID,
  GITHUB_ISSUE_TAXONOMY_SCHEMA,
  assertGithubIssueTaxonomy,
} from '../config/github-issue-taxonomy.ts';
import { asGithubIssueConceptId } from './types/branded.ts';
import {
  partnerOpsColorWire,
  type PartnerOpsColorKey,
} from './telegram/partner-ops-color-kernel.ts';

export const GITHUB_ISSUE_TAXONOMY_PUBLIC_SCHEMA =
  'factorywager.github-issue-taxonomy.public.v1' as const;
export const GITHUB_ISSUE_TAXONOMY_PUBLIC_VERSION = 1 as const;
export const GITHUB_ISSUE_TAXONOMY_PUBLIC_PATH = '/registry/github-issue-taxonomy.json' as const;
export const GITHUB_ISSUE_TAXONOMY_PUBLIC_CONCEPT_ID = asGithubIssueConceptId(
  'registry.github_issue_taxonomy'
);
export const GITHUB_ISSUE_TAXONOMY_PUBLIC_COLOR_KEY: PartnerOpsColorKey = 'middleware';

const AUTHORITY_LINKS = [
  'config/github-issue-taxonomy.ts',
  'docs/harness/AUTHORITY.md',
  'docs/harness/tenants/github-issue-taxonomy.md',
  'registry-index.md',
] as const;

const SOURCE_FILES = [
  'config/github-issue-taxonomy.ts',
  'lib/telegram/partner-ops-color-kernel.ts',
] as const;

function buildDimensions() {
  return Object.values(GITHUB_ISSUE_DIMENSIONS).map(key => ({
    key,
    required: GITHUB_ISSUE_REQUIRED_DIMENSIONS.some(required => required === key),
    values: GITHUB_ISSUE_LABELS.filter(label => label.dimension === key)
      .map(label => label.value)
      .sort((a, b) => a.localeCompare(b)),
  }));
}

function buildLabels() {
  return [...GITHUB_ISSUE_LABELS]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(label => ({
      key: label.key,
      dimension: label.dimension,
      value: label.value,
      github: {
        name: label.githubName,
        description: label.githubDescription,
        hex: label.githubColor.toLowerCase(),
      },
      color: partnerOpsColorWire(label.colorKey),
    }));
}

function sourceHash(serializedSource: string): string {
  return Bun.CryptoHasher.hash('sha256', serializedSource, 'hex');
}

export function buildGithubIssueTaxonomyPublicArtifact() {
  assertGithubIssueTaxonomy();
  const dimensions = buildDimensions();
  const labels = buildLabels();
  const legalCombinations = [
    {
      id: 'p0-bug-only', // brand-ok — public rule slug, not a domain entity id
      description: 'Priority p0 is reserved for bug and incident work.',
    },
    {
      id: 'bug-not-planned', // brand-ok — public rule slug, not a domain entity id
      description: 'Bug issues enter as active, blocked, or done rather than planned.',
    },
  ] as const;
  const hash = sourceHash(JSON.stringify({ dimensions, labels, legalCombinations }));

  return {
    schema: GITHUB_ISSUE_TAXONOMY_PUBLIC_SCHEMA,
    artifactVersion: GITHUB_ISSUE_TAXONOMY_PUBLIC_VERSION,
    artifactId: GITHUB_ISSUE_TAXONOMY_ARTIFACT_ID,
    conceptId: GITHUB_ISSUE_TAXONOMY_PUBLIC_CONCEPT_ID,
    path: GITHUB_ISSUE_TAXONOMY_PUBLIC_PATH,
    color: partnerOpsColorWire(GITHUB_ISSUE_TAXONOMY_PUBLIC_COLOR_KEY),
    ownership: {
      owner: 'platform / governance',
      plane: 'public',
      authority: [...AUTHORITY_LINKS],
    },
    dimensions,
    labels,
    legalCombinations,
    audit: {
      ok: true,
      dimensions: dimensions.length,
      requiredDimensions: dimensions.filter(dimension => dimension.required).length,
      labels: labels.length,
      legalRules: legalCombinations.length,
      sourceHash: hash,
      errors: [] as string[],
    },
    provenance: {
      generatedBy: 'tools/bake-github-issue-taxonomy.ts',
      sourceSchema: GITHUB_ISSUE_TAXONOMY_SCHEMA,
      sources: [...SOURCE_FILES],
      sourceHash: hash,
      runtime: 'bun',
    },
  } as const;
}

export type GithubIssueTaxonomyPublicArtifact = ReturnType<
  typeof buildGithubIssueTaxonomyPublicArtifact
>;

export function serializeGithubIssueTaxonomyPublicArtifact(
  artifact: GithubIssueTaxonomyPublicArtifact = buildGithubIssueTaxonomyPublicArtifact()
): string {
  return `${JSON.stringify(artifact, null, 2)}\n`;
}
