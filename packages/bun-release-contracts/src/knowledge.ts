/** Public facade for deterministic, provenance-bearing Bun release knowledge. */
export * from './knowledge-types.ts';
export { extractMarkdownCodeExamples } from './knowledge-markdown.ts';
export { parseKnowledgeCatalog } from './knowledge-enrichment.ts';
export { normalizeReleaseKnowledge, releaseKnowledgeExampleId } from './knowledge-normalize.ts';
export { parseReleaseKnowledge, renderReleaseKnowledge } from './knowledge-schema.ts';
export { parseReleaseKnowledgeShapeIssues } from './knowledge-shape.ts';
export {
  buildKnowledgeValidationReport,
  knowledgeValidationConfig,
  knowledgeValidationPasses,
} from './knowledge-validation-config.ts';
export {
  validateKnowledgeProvenance,
  validateKnowledgeSourceConsistency,
} from './knowledge-validation-consistency.ts';
export { parseReleaseKnowledgeValidation } from './knowledge-validation.ts';
export {
  releaseKnowledgeProvenance,
  validateReleaseKnowledgeDirectory,
  validateReleaseKnowledgeFile,
} from './knowledge-validation-io.ts';
export {
  renderKnowledgeValidationJUnit,
  writeKnowledgeValidationReports,
} from './knowledge-validation-report.ts';
export type * from './knowledge-validation-types.ts';
export {
  adoptionMatrixRows,
  diffReleaseKnowledge,
  searchReleaseKnowledge,
} from './knowledge-query.ts';
