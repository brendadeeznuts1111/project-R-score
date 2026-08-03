/**
 * Concept Registry — Phase 1 public surface.
 *
 * Persistent bun:sqlite store for glossary concepts with versioning,
 * usage tracking, review workflow, HTTP API, and semantic graph.
 */
export {
  DEFAULT_CONCEPT_REGISTRY_DB_PATH,
  openConceptRegistryDb,
  type OpenConceptRegistryDbOpts,
} from './db.ts';
export { ensureConceptRegistrySchema, CONCEPT_REGISTRY_DDL } from './schema.ts';
export {
  approveConcept,
  archiveConcept,
  countConcepts,
  defaultAuthor,
  deprecateConcept,
  getConcept,
  listConcepts,
  listReviews,
  listUsage,
  listVersions,
  proposeConcept,
  recordProvenance,
  upsertConcept,
  upsertUsage,
} from './repository.ts';
export {
  approveProposal,
  computeConceptHealth,
  conceptHistory,
  deprecateWithReason,
  listProposals,
  proposeForReview,
  rejectProposal,
  saveDraft,
  submitProposal,
} from './lifecycle.ts';
export {
  buildConceptGraph,
  graphCentrality,
  graphOrphans,
  graphStaleEdges,
  graphToMermaid,
} from './graph.ts';
export {
  seedConceptRegistry,
  seedFromDomainGlossary,
  seedFromSemanticVocabulary,
  seedUsageFromPortal,
  type SeedReport,
} from './seed.ts';
export {
  createConceptRegistryFetch,
  handleConceptRegistryRequest,
  type ConceptRegistryFetch,
} from './api.ts';
export type {
  ConceptGraph,
  ConceptHealthSnapshot,
  ConceptHistoryEvent,
  ConceptListFilters,
  ConceptProposalRow,
  ConceptStatus,
  ConceptVersion,
  GraphEdge,
  GraphNode,
  ProposeConceptInput,
  RegistryConcept,
} from './types.ts';
export {
  CONCEPT_STATUSES,
  LIFECYCLE_TRANSITIONS,
  canTransition,
  conceptCategoryOf,
  conceptGroupOf,
  isConceptStatus,
} from './types.ts';
