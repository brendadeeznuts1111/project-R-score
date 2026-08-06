/**
 * @domain governance
 * @module lib/types/branded/governance.ts
 *
 * Repository-governed GitHub issue taxonomy values. GitHub payloads enter
 * through `lib/github-issue-taxonomy-wire.ts`; interior code keeps these
 * brands distinct from provider strings and unrelated artifact identities.
 */

import { BrandValidationError } from '../../core/core-errors.ts';
import {
  defineBrandConstructors,
  type BrandName,
  type BrandSpec,
  type BrandedString,
} from './_core.ts';

export type GithubIssueArtifactId = BrandedString<'GithubIssueArtifactId'>;
export type GithubIssueConceptId = BrandedString<'GithubIssueConceptId'>;
export type GithubIssueLabelKey = BrandedString<'GithubIssueLabelKey'>;
export type GithubIssueLabelNameKey = BrandedString<'GithubIssueLabelNameKey'>;
export type GithubIssueDimensionCode = BrandedString<'GithubIssueDimensionCode'>;
export type GithubIssueTypeCode = BrandedString<'GithubIssueTypeCode'>;
export type GithubIssuePriorityCode = BrandedString<'GithubIssuePriorityCode'>;
export type GithubIssuePlaneCode = BrandedString<'GithubIssuePlaneCode'>;
export type GithubIssueRuntimeCode = BrandedString<'GithubIssueRuntimeCode'>;
export type GithubIssueTeamCode = BrandedString<'GithubIssueTeamCode'>;
export type GithubIssueStatusCode = BrandedString<'GithubIssueStatusCode'>;
export type GithubIssueUrgencyCode = BrandedString<'GithubIssueUrgencyCode'>;
export type GithubIssueConcernCode = BrandedString<'GithubIssueConcernCode'>;

function defineGovernanceBrand<Name extends BrandName>(name: Name, pattern: RegExp) {
  const base = defineBrandConstructors(name);
  const as = (value: string) => {
    const normalized = value.trim();
    if (!pattern.test(normalized)) throw new BrandValidationError(name, value);
    return base.as(normalized);
  };
  const tryFn = (value: string | undefined | null) => {
    if (value == null || value.trim() === '') return undefined;
    try {
      return as(value);
    } catch {
      return undefined;
    }
  };
  const parse = (value: unknown) => {
    if (typeof value !== 'string') throw new BrandValidationError(name, String(value));
    return as(value);
  };
  return { as, try: tryFn, parse } as const;
}

const artifact = defineGovernanceBrand('GithubIssueArtifactId', /^[a-z0-9][a-z0-9._-]*$/);
const concept = defineGovernanceBrand(
  'GithubIssueConceptId',
  /^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)*$/
);
const label = defineGovernanceBrand(
  'GithubIssueLabelKey',
  /^[a-z][a-z0-9_]*\.[a-z0-9][a-z0-9_-]*$/
);
const labelName = defineGovernanceBrand('GithubIssueLabelNameKey', /^[a-z0-9][a-z0-9-]*$/);
const dimension = defineGovernanceBrand(
  'GithubIssueDimensionCode',
  /^(type|priority|plane|runtime|team|status|urgency|concern)$/
);
const type = defineGovernanceBrand('GithubIssueTypeCode', /^(bug|enhancement)$/);
const priority = defineGovernanceBrand('GithubIssuePriorityCode', /^p[0-2]$/);
const plane = defineGovernanceBrand(
  'GithubIssuePlaneCode',
  /^(governance|domain|local|public|portal)$/
);
const runtime = defineGovernanceBrand('GithubIssueRuntimeCode', /^(bun|agnostic)$/);
const team = defineGovernanceBrand('GithubIssueTeamCode', /^(infrastructure)$/);
const status = defineGovernanceBrand('GithubIssueStatusCode', /^(planned|active|blocked|done)$/);
const urgency = defineGovernanceBrand('GithubIssueUrgencyCode', /^(high)$/);
const concern = defineGovernanceBrand('GithubIssueConcernCode', /^(resource-management)$/);

export const asGithubIssueArtifactId = artifact.as;
export const tryGithubIssueArtifactId = artifact.try;
export const parseGithubIssueArtifactId = artifact.parse;

export const asGithubIssueConceptId = concept.as;
export const tryGithubIssueConceptId = concept.try;
export const parseGithubIssueConceptId = concept.parse;

export const asGithubIssueLabelKey = label.as;
export const tryGithubIssueLabelKey = label.try;
export const parseGithubIssueLabelKey = label.parse;

export const asGithubIssueLabelNameKey = labelName.as;
export const tryGithubIssueLabelNameKey = labelName.try;
export const parseGithubIssueLabelNameKey = labelName.parse;

export const asGithubIssueDimensionCode = dimension.as;
export const tryGithubIssueDimensionCode = dimension.try;
export const parseGithubIssueDimensionCode = dimension.parse;

export const asGithubIssueTypeCode = type.as;
export const tryGithubIssueTypeCode = type.try;
export const parseGithubIssueTypeCode = type.parse;

export const asGithubIssuePriorityCode = priority.as;
export const tryGithubIssuePriorityCode = priority.try;
export const parseGithubIssuePriorityCode = priority.parse;

export const asGithubIssuePlaneCode = plane.as;
export const tryGithubIssuePlaneCode = plane.try;
export const parseGithubIssuePlaneCode = plane.parse;

export const asGithubIssueRuntimeCode = runtime.as;
export const tryGithubIssueRuntimeCode = runtime.try;
export const parseGithubIssueRuntimeCode = runtime.parse;

export const asGithubIssueTeamCode = team.as;
export const tryGithubIssueTeamCode = team.try;
export const parseGithubIssueTeamCode = team.parse;

export const asGithubIssueStatusCode = status.as;
export const tryGithubIssueStatusCode = status.try;
export const parseGithubIssueStatusCode = status.parse;

export const asGithubIssueUrgencyCode = urgency.as;
export const tryGithubIssueUrgencyCode = urgency.try;
export const parseGithubIssueUrgencyCode = urgency.parse;

export const asGithubIssueConcernCode = concern.as;
export const tryGithubIssueConcernCode = concern.try;
export const parseGithubIssueConcernCode = concern.parse;

export const GOVERNANCE_BRAND_SPECS = [
  {
    name: 'GithubIssueArtifactId',
    domain: 'governance',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Issue-spine artifact identity governed by the repository taxonomy',
    validation: {
      shape: 'pattern',
      pattern: '^[a-z0-9][a-z0-9._-]*$',
      ingressNormalization: 'trim',
    },
  },
  {
    name: 'GithubIssueConceptId',
    domain: 'governance',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Optional glossary concept identity carried by issue-spine metadata',
    validation: {
      shape: 'pattern',
      pattern: '^[A-Za-z][A-Za-z0-9_]*(?:\\.[A-Za-z0-9_]+)*$',
      ingressNormalization: 'trim',
    },
  },
  {
    name: 'GithubIssueLabelKey',
    domain: 'governance',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Semantic dimension.value key for a governed GitHub issue label',
    validation: {
      shape: 'pattern',
      pattern: '^[a-z][a-z0-9_]*\\.[a-z0-9][a-z0-9_-]*$',
      ingressNormalization: 'trim',
    },
  },
  {
    name: 'GithubIssueLabelNameKey',
    domain: 'governance',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'GitHub-facing label name projected from the semantic taxonomy',
    validation: {
      shape: 'pattern',
      pattern: '^[a-z0-9][a-z0-9-]*$',
      ingressNormalization: 'trim',
    },
  },
  {
    name: 'GithubIssueDimensionCode',
    domain: 'governance',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Issue taxonomy dimension code',
    validation: {
      shape: 'pattern',
      pattern: '^(type|priority|plane|runtime|team|status|urgency|concern)$',
      ingressNormalization: 'trim',
    },
  },
  {
    name: 'GithubIssueTypeCode',
    domain: 'governance',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Issue-spine type value',
    validation: {
      shape: 'pattern',
      pattern: '^(bug|enhancement)$',
      ingressNormalization: 'trim',
    },
  },
  {
    name: 'GithubIssuePriorityCode',
    domain: 'governance',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Issue-spine priority value',
    validation: {
      shape: 'pattern',
      pattern: '^p[0-2]$',
      ingressNormalization: 'trim',
    },
  },
  {
    name: 'GithubIssuePlaneCode',
    domain: 'governance',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Issue-spine ownership plane',
    validation: {
      shape: 'pattern',
      pattern: '^(governance|domain|local|public|portal)$',
      ingressNormalization: 'trim',
    },
  },
  {
    name: 'GithubIssueRuntimeCode',
    domain: 'governance',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Issue-spine runtime ownership value',
    validation: {
      shape: 'pattern',
      pattern: '^(bun|agnostic)$',
      ingressNormalization: 'trim',
    },
  },
  {
    name: 'GithubIssueTeamCode',
    domain: 'governance',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Issue-spine owning team value',
    validation: {
      shape: 'pattern',
      pattern: '^(infrastructure)$',
      ingressNormalization: 'trim',
    },
  },
  {
    name: 'GithubIssueStatusCode',
    domain: 'governance',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Issue-spine lifecycle status',
    validation: {
      shape: 'pattern',
      pattern: '^(planned|active|blocked|done)$',
      ingressNormalization: 'trim',
    },
  },
  {
    name: 'GithubIssueUrgencyCode',
    domain: 'governance',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Optional issue urgency facet',
    validation: {
      shape: 'pattern',
      pattern: '^(high)$',
      ingressNormalization: 'trim',
    },
  },
  {
    name: 'GithubIssueConcernCode',
    domain: 'governance',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Optional issue concern facet',
    validation: {
      shape: 'pattern',
      pattern: '^(resource-management)$',
      ingressNormalization: 'trim',
    },
  },
] as const satisfies readonly BrandSpec[];
