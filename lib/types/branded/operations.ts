/**
 * @domain operations
 * @module lib/types/branded/operations.ts
 *
 * Jobs, pipelines, webhooks, and resource handles.
 * Pattern (isomorphic): type + as* + try* + parse* + BRAND_SPECS entry.
 */

import { BrandValidationError } from '../../core/core-errors.ts';
import {
  defineBrandConstructors,
  type BrandSpec,
  type BrandValidationSpec,
  type BrandedString,
} from './_core.ts';

export type OperationId = BrandedString<'OperationId'>;
export type ResourceId = BrandedString<'ResourceId'>;
export type ProjectId = BrandedString<'ProjectId'>;
export type PipelineId = BrandedString<'PipelineId'>;
export type JobId = BrandedString<'JobId'>;
export type StepId = BrandedString<'StepId'>;
export type WebhookId = BrandedString<'WebhookId'>;
export type FeedId = BrandedString<'FeedId'>;
export type RunId = BrandedString<'RunId'>;
export type DecisionId = BrandedString<'DecisionId'>;
export type LoopId = BrandedString<'LoopId'>;
/** Ops tree node (partner / agent / sub_agent) primary key. */
export type TreeNodeId = BrandedString<'TreeNodeId'>;
/** Factorial / A/B experiment primary key. */
export type ExperimentId = BrandedString<'ExperimentId'>;
/** One design cell (variant) within an experiment. */
export type ExperimentVariantId = BrandedString<'ExperimentVariantId'>;
/** Sticky partner → variant assignment row. */
export type ExperimentAssignmentId = BrandedString<'ExperimentAssignmentId'>;
/** Partner profile binding key (tree node ↔ template). */
export type PartnerProfileKey = BrandedString<'PartnerProfileKey'>;
/** Partner onboarding template identifier. */
export type PartnerTemplateId = BrandedString<'PartnerTemplateId'>;
/** Policy gate decision row id. */
export type GateDecisionId = BrandedString<'GateDecisionId'>;
/** Unified ops channel outbox event id. */
export type OpsChannelEventId = BrandedString<'OpsChannelEventId'>;
/**
 * US state / jurisdiction code for regulatory scoping (e.g. MA, NJ).
 * Always stored uppercase two-letter.
 */
export type StateCode = BrandedString<'StateCode'>;
/**
 * US ZIP or ZIP+4 postal code (digits only; ZIP+4 uses hyphen).
 * Discrete column — never packed into location text.
 */
export type ZipCode = BrandedString<'ZipCode'>;

const operation = defineBrandConstructors('OperationId');
const resource = defineBrandConstructors('ResourceId');
const project = defineBrandConstructors('ProjectId');
const pipeline = defineBrandConstructors('PipelineId');
const job = defineBrandConstructors('JobId');
const step = defineBrandConstructors('StepId');
const webhook = defineBrandConstructors('WebhookId');
const feed = defineBrandConstructors('FeedId');
const run = defineBrandConstructors('RunId');
const decision = defineBrandConstructors('DecisionId');
const loop = defineBrandConstructors('LoopId');
const treeNode = defineBrandConstructors('TreeNodeId');
const experiment = defineBrandConstructors('ExperimentId');
const experimentVariant = defineBrandConstructors('ExperimentVariantId');
const experimentAssignment = defineBrandConstructors('ExperimentAssignmentId');
const partnerProfileKey = defineBrandConstructors('PartnerProfileKey');
const partnerTemplateId = defineBrandConstructors('PartnerTemplateId');
const gateDecisionId = defineBrandConstructors('GateDecisionId');
const opsChannelEventId = defineBrandConstructors('OpsChannelEventId');

export const asOperationId = operation.as;
export const tryOperationId = operation.try;
export const parseOperationId = operation.parse;

export const asResourceId = resource.as;
export const tryResourceId = resource.try;
export const parseResourceId = resource.parse;

export const asProjectId = project.as;
export const tryProjectId = project.try;
export const parseProjectId = project.parse;

export const asPipelineId = pipeline.as;
export const tryPipelineId = pipeline.try;
export const parsePipelineId = pipeline.parse;

export const asJobId = job.as;
export const tryJobId = job.try;
export const parseJobId = job.parse;

export const asStepId = step.as;
export const tryStepId = step.try;
export const parseStepId = step.parse;

export const asWebhookId = webhook.as;
export const tryWebhookId = webhook.try;
export const parseWebhookId = webhook.parse;

export const asFeedId = feed.as;
export const tryFeedId = feed.try;
export const parseFeedId = feed.parse;

export const asRunId = run.as;
export const tryRunId = run.try;
export const parseRunId = run.parse;

export const asDecisionId = decision.as;
export const tryDecisionId = decision.try;
export const parseDecisionId = decision.parse;

export const asLoopId = loop.as;
export const tryLoopId = loop.try;
export const parseLoopId = loop.parse;

export const asTreeNodeId = treeNode.as;
export const tryTreeNodeId = treeNode.try;
export const parseTreeNodeId = treeNode.parse;

export const asExperimentId = experiment.as;
export const tryExperimentId = experiment.try;
export const parseExperimentId = experiment.parse;

export const asExperimentVariantId = experimentVariant.as;
export const tryExperimentVariantId = experimentVariant.try;
export const parseExperimentVariantId = experimentVariant.parse;

export const asExperimentAssignmentId = experimentAssignment.as;
export const tryExperimentAssignmentId = experimentAssignment.try;
export const parseExperimentAssignmentId = experimentAssignment.parse;

export const asPartnerProfileKey = partnerProfileKey.as;
export const tryPartnerProfileKey = partnerProfileKey.try;
export const parsePartnerProfileKey = partnerProfileKey.parse;

export const asPartnerTemplateId = partnerTemplateId.as;
export const tryPartnerTemplateId = partnerTemplateId.try;
export const parsePartnerTemplateId = partnerTemplateId.parse;

export const asGateDecisionId = gateDecisionId.as;
export const tryGateDecisionId = gateDecisionId.try;
export const parseGateDecisionId = gateDecisionId.parse;

export const asOpsChannelEventId = opsChannelEventId.as;
export const tryOpsChannelEventId = opsChannelEventId.try;
export const parseOpsChannelEventId = opsChannelEventId.parse;

/** Primary regulated jurisdictions for sports-wager compliance (MA / NJ). */
export const REGULATED_STATE_CODES = ['MA', 'NJ'] as const;
export type RegulatedStateCode = (typeof REGULATED_STATE_CODES)[number];

const STATE_CODE_VALIDATION = {
  shape: 'pattern',
  pattern: '^[A-Z]{2}$',
  ingressNormalization: 'trim-uppercase',
} as const satisfies BrandValidationSpec;
const STATE_CODE_RE = new RegExp(STATE_CODE_VALIDATION.pattern);

function normalizeStateCode(value: string): string {
  return value.trim().toUpperCase();
}

export function asStateCode(value: string): StateCode {
  const code = normalizeStateCode(value);
  if (!STATE_CODE_RE.test(code)) {
    throw new BrandValidationError('StateCode', value);
  }
  return code as StateCode;
}

export function tryStateCode(value: string | undefined | null): StateCode | undefined {
  if (value == null) return undefined;
  const code = normalizeStateCode(String(value));
  if (!code || !STATE_CODE_RE.test(code)) return undefined;
  return code as StateCode;
}

export function parseStateCode(value: unknown): StateCode {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new BrandValidationError('StateCode', value as never);
  }
  return asStateCode(value);
}

/** US ZIP (`12345`) or ZIP+4 (`12345-6789`). */
const ZIP_CODE_VALIDATION = {
  shape: 'pattern',
  pattern: '^\\d{5}(-\\d{4})?$',
  ingressNormalization: 'trim',
} as const satisfies BrandValidationSpec;
const ZIP_CODE_RE = new RegExp(ZIP_CODE_VALIDATION.pattern);

export function asZipCode(value: string): ZipCode {
  const z = value.trim();
  if (!ZIP_CODE_RE.test(z)) {
    throw new BrandValidationError('ZipCode', value);
  }
  return z as ZipCode;
}

export function tryZipCode(value: string | undefined | null): ZipCode | undefined {
  if (value == null) return undefined;
  const z = String(value).trim();
  if (!z || !ZIP_CODE_RE.test(z)) return undefined;
  return z as ZipCode;
}

export function parseZipCode(value: unknown): ZipCode {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new BrandValidationError('ZipCode', value as never);
  }
  return asZipCode(value);
}

export const OPERATIONS_BRAND_SPECS = [
  {
    name: 'OperationId',
    domain: 'operations',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Batch or async operation handle',
  },
  {
    name: 'ResourceId',
    domain: 'operations',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Generic resource pointer (errors, ACL subjects)',
  },
  {
    name: 'ProjectId',
    domain: 'operations',
    tiers: ['as', 'try', 'parse'],
    mint: ['user-input', 'wire-input'],
    description: 'Project / workspace identity',
  },
  {
    name: 'PipelineId',
    domain: 'operations',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Transform or CI pipeline identity',
  },
  {
    name: 'JobId',
    domain: 'operations',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Scheduled or queued job identity',
  },
  {
    name: 'StepId',
    domain: 'operations',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Pipeline step identity',
  },
  {
    name: 'WebhookId',
    domain: 'operations',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Webhook registration identity',
  },
  {
    name: 'FeedId',
    domain: 'operations',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'RSS / event feed identity',
  },
  {
    name: 'RunId',
    domain: 'operations',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal'],
    description: 'Benchmark / search-loop run identity',
  },
  {
    name: 'DecisionId',
    domain: 'operations',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Decision evidence record identity',
  },
  {
    name: 'LoopId',
    domain: 'operations',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal'],
    description: 'Search / maintenance loop identity',
  },
  {
    name: 'TreeNodeId',
    domain: 'operations',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Ops tree node (partner / agent / sub_agent) identity',
  },
  {
    name: 'ExperimentId',
    domain: 'operations',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'user-input', 'wire-input'],
    description: 'Factorial or multi-variant experiment identity',
  },
  {
    name: 'ExperimentVariantId',
    domain: 'operations',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal'],
    description: 'One design cell (factor combination) in an experiment',
  },
  {
    name: 'ExperimentAssignmentId',
    domain: 'operations',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal'],
    description: 'Sticky partner-to-variant assignment row',
  },
  {
    name: 'PartnerProfileKey',
    domain: 'operations',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal'],
    description: 'Partner profile binding key for tree node ↔ template',
  },
  {
    name: 'PartnerTemplateId',
    domain: 'operations',
    tiers: ['as', 'try', 'parse'],
    mint: ['user-input', 'wire-input'],
    description: 'Partner onboarding template identifier',
  },
  {
    name: 'GateDecisionId',
    domain: 'operations',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal'],
    description: 'Policy gate decision row for play dispatch',
  },
  {
    name: 'OpsChannelEventId',
    domain: 'operations',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal'],
    description: 'Unified ops channel outbox event id',
  },
  {
    name: 'StateCode',
    domain: 'operations',
    tiers: ['as', 'try', 'parse'],
    mint: ['user-input', 'wire-input'],
    description: 'US state jurisdiction code for regulatory scoping (MA, NJ, …)',
    validation: STATE_CODE_VALIDATION,
  },
  {
    name: 'ZipCode',
    domain: 'operations',
    tiers: ['as', 'try', 'parse'],
    mint: ['user-input', 'wire-input'],
    description: 'US ZIP or ZIP+4 postal code (discrete geo column)',
    validation: ZIP_CODE_VALIDATION,
  },
] as const satisfies readonly BrandSpec[];
