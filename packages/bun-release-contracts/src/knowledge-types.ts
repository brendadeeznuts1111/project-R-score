import type { ReleaseKnowledgeExampleId } from '../../../lib/types/branded.ts';

export type ExampleStability =
  'stable' | 'experimental' | 'highly-experimental' | 'deprecated' | 'unknown';

export type KnowledgeCatalogEntry = {
  name: string;
  stability: 'stable' | 'experimental' | 'deprecated';
  docsUrl: string | null;
  description: string | null;
};

export type MarkdownCodeExample = {
  language: string;
  code: string;
  section: string;
  featureSection: string;
  context: string;
  sourceLine: number;
  sectionOrdinal: number;
};

export type ReleaseKnowledgeExample = {
  id: ReleaseKnowledgeExampleId;
  slot: string;
  feature: string;
  section: string;
  purpose: string;
  language: string;
  code: string;
  stability: ExampleStability;
  api: string[];
  dependencies: string[];
  runnable: boolean;
  requiresSetup: string[];
  docsLinks: string[];
  sourceLine: number;
};

export type ReleaseKnowledge = {
  schemaVersion: 1;
  runtime: 'bun';
  releaseVersion: string;
  sourceUrl: string;
  sourceMarkdownUrl: string;
  publishedAt: string;
  counts: { examples: number; runnable: number; documented: number };
  examples: ReleaseKnowledgeExample[];
};

export type ReleaseKnowledgeDiff = {
  from: string;
  to: string;
  addedFeatures: string[];
  removedFeatures: string[];
  addedExamples: string[];
  removedExamples: string[];
  changedExamples: Array<{ slot: string; before: string; after: string }>;
};

export type ReleaseKnowledgeSearchHit = ReleaseKnowledgeExample & { score: number };
