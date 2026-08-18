import type { ReleaseKnowledge } from './knowledge-types.ts';

export type KnowledgeValidationSeverity = 'error' | 'warning';

export type KnowledgeValidationRule =
  | 'file'
  | 'json'
  | 'shape'
  | 'schema'
  | 'provenance'
  | 'content'
  | 'language'
  | 'ordering'
  | 'execution-metadata'
  | 'documentation'
  | 'stability'
  | 'source-count'
  | 'source-drift';

export type KnowledgeValidationFinding = {
  rule: KnowledgeValidationRule;
  severity: KnowledgeValidationSeverity;
  path: string;
  message: string;
};

export type KnowledgeValidationFileState = {
  path: string;
  exists: boolean;
  parseable: boolean;
  schemaValid: boolean;
};

export type KnowledgeValidationConfig = {
  strict: boolean;
  maxWarnings: number;
};

export type KnowledgeValidationReport = {
  schemaVersion: 1;
  kind: 'bun-release-knowledge-validation';
  target: string;
  releaseVersion: string | null;
  valid: boolean;
  strict: boolean;
  maxWarnings: number;
  counts: { errors: number; warnings: number };
  files: {
    normalized: KnowledgeValidationFileState;
    source: KnowledgeValidationFileState | null;
  };
  findings: KnowledgeValidationFinding[];
};

export type KnowledgeValidationResult = {
  knowledge: ReleaseKnowledge | null;
  findings: KnowledgeValidationFinding[];
};

export const KNOWLEDGE_VALIDATION_REPORT_FORMATS = ['console', 'json', 'junit'] as const;

export type KnowledgeValidationReportFormat = (typeof KNOWLEDGE_VALIDATION_REPORT_FORMATS)[number];
