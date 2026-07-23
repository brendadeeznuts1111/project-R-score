/**
 * @domain operations
 * @module lib/types/branded/operations.ts
 *
 * Jobs, pipelines, webhooks, and resource handles.
 * Pattern (isomorphic): type + as* + try* + parse* + BRAND_SPECS entry.
 */

import { defineBrandConstructors, type BrandSpec, type BrandedString } from './_core.ts';

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

export const OPERATIONS_BRAND_SPECS: readonly BrandSpec[] = [
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
] as const;
