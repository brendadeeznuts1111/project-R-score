import type {
  ReleaseAssetId,
  ReleaseKnowledgeExampleId,
  ReleaseKnowledgeNodeId,
} from '../../../lib/types/branded.ts';

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

type ReleaseKnowledgeNodeBase = {
  id: ReleaseKnowledgeNodeId;
  parentId: ReleaseKnowledgeNodeId | null;
  childIds: ReleaseKnowledgeNodeId[];
  sourceLine: number;
  endLine: number;
};

export type ReleaseKnowledgeDocumentNode = ReleaseKnowledgeNodeBase & {
  type: 'document';
  parentId: null;
  metadata: Record<string, string>;
};

export type ReleaseKnowledgeHeadingNode = ReleaseKnowledgeNodeBase & {
  type: 'heading';
  depth: 2 | 3 | 4;
  text: string;
  slug: string;
};

export type ReleaseKnowledgeCodeBlockNode = ReleaseKnowledgeNodeBase & {
  type: 'codeBlock';
  childIds: [];
  language: string;
  meta: string;
  code: string;
  exampleId: ReleaseKnowledgeExampleId;
};

export type ReleaseKnowledgeAssetNode = ReleaseKnowledgeNodeBase & {
  type: 'asset';
  childIds: [];
  directive: 'image' | 'lazyVideo' | 'iframe';
  sourceUrls: string[];
  assetIds: ReleaseAssetId[];
  metadata: Record<string, string>;
};

export type ReleaseKnowledgeNode =
  | ReleaseKnowledgeDocumentNode
  | ReleaseKnowledgeHeadingNode
  | ReleaseKnowledgeCodeBlockNode
  | ReleaseKnowledgeAssetNode;

export type ReleaseKnowledgeAst = {
  rootId: ReleaseKnowledgeNodeId;
  nodes: ReleaseKnowledgeNode[];
};

export type ReleaseKnowledge = {
  schemaVersion: 1 | 2;
  runtime: 'bun';
  releaseVersion: string;
  sourceUrl: string;
  sourceMarkdownUrl: string;
  publishedAt: string;
  counts: { examples: number; runnable: number; documented: number; astNodes?: number };
  examples: ReleaseKnowledgeExample[];
  ast?: ReleaseKnowledgeAst;
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
