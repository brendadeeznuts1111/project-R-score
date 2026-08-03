/**
 * Concept Registry — domain types (interior after wire parse).
 * Glossary concept keys are opaque strings documented with // brand-ok.
 *
 * @see lib/partner-profile/ledger.ts — same bun:sqlite repository pattern
 */

/**
 * Lifecycle:
 *   draft → proposed → active → deprecated → archived
 *                 ↘ rejected ↗ (resubmit)
 */
export const CONCEPT_STATUSES = [
  'draft',
  'proposed',
  'active',
  'deprecated',
  'archived',
  'rejected',
] as const;
export type ConceptStatus = (typeof CONCEPT_STATUSES)[number];

export const REVIEW_STATUSES = ['proposed', 'approved', 'rejected'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/** Legal transitions (from → to[]). Application-enforced; SQLite CHECK is permissive. */
export const LIFECYCLE_TRANSITIONS: Readonly<Record<ConceptStatus, readonly ConceptStatus[]>> = {
  draft: ['proposed', 'archived'],
  proposed: ['active', 'rejected', 'draft', 'archived'],
  active: ['deprecated', 'archived'],
  deprecated: ['archived', 'active'],
  rejected: ['proposed', 'draft', 'archived'],
  archived: [],
};

export function canTransition(from: ConceptStatus, to: ConceptStatus): boolean {
  return (LIFECYCLE_TRANSITIONS[from] as readonly string[]).includes(to);
}

export const EDGE_TYPES = ['seeAlso', 'mapsTo', 'displayedAs', 'replaces', 'deprecatedBy'] as const;
export type ConceptEdgeType = (typeof EDGE_TYPES)[number];

export type RegistryConcept = {
  id: string; // brand-ok — glossary concept key
  label: string;
  kind: string;
  category: string;
  groupName: string;
  /** Business domain lane (optional until domain-mapping merges). */
  domain: string | null;
  status: ConceptStatus;
  color: string | null;
  unit: string | null;
  format: string | null;
  summary: string | null;
  mapsTo: string | null; // brand-ok — target concept or registry column
  seeAlso: string[]; // brand-ok — related concept keys
  source: string | null;
  createdAt: string;
  updatedAt: string;
  deprecatedAt: string | null;
  deprecatedBy: string | null; // brand-ok — replacement concept key
  deprecationReason: string | null;
};

export type ConceptVersion = {
  conceptId: string; // brand-ok — glossary concept key
  version: number;
  snapshot: string; // JSON
  createdAt: string;
  author: string;
};

export type ConceptUsageRow = {
  conceptId: string; // brand-ok — glossary concept key
  board: string;
  filePath: string;
  count: number;
  lastSeenAt: string;
};

export type ConceptProvenanceRow = {
  conceptId: string; // brand-ok — glossary concept key
  correlationId: string; // brand-ok — work-item provenance ref
  author: string;
  committedAt: string;
};

export type ConceptReviewRow = {
  id: number;
  conceptId: string; // brand-ok — glossary concept key
  status: ReviewStatus;
  reviewer: string | null;
  reviewedAt: string | null;
  comments: string | null;
  createdAt: string;
};

export type ProposeConceptInput = {
  id: string; // brand-ok — glossary concept key
  label: string;
  kind?: string;
  category?: string;
  group?: string;
  domain?: string;
  summary?: string;
  color?: string;
  unit?: string;
  format?: string;
  mapsTo?: string;
  seeAlso?: string[];
  author?: string;
  correlationId?: string; // brand-ok — work-item provenance ref
  /** When true, create as draft (WIP). Default false → proposed (ready for review). */
  asDraft?: boolean;
  reviewer?: string;
};

export type ConceptHistoryEvent = {
  at: string;
  kind: 'version' | 'review' | 'proposal';
  summary: string;
  author: string | null;
  detail?: Record<string, string | number | null>;
};

export type ConceptHealthSnapshot = {
  measuredAt: string;
  total: number;
  byStatus: Record<ConceptStatus, number>;
  proposalAgeDaysMax: number;
  proposalsOlderThan7d: number;
  usageRatio: number;
  deprecationBacklog: number;
  provenanceCoverage: number;
  alerts: string[];
};

export type ConceptProposalRow = {
  id: string; // brand-ok — proposal row id
  conceptId: string; // brand-ok — glossary concept key
  status: ConceptStatus;
  reviewer: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  ageDays: number;
};

export type ConceptListFilters = {
  status?: ConceptStatus | ConceptStatus[];
  category?: string | string[];
  group?: string | string[];
  q?: string;
  limit?: number;
  offset?: number;
};

export type GraphNode = {
  id: string; // brand-ok — glossary concept key
  label: string;
  group: string;
  category: string;
  status: ConceptStatus;
  degree?: number;
};

export type GraphEdge = {
  source: string; // brand-ok — glossary concept key
  target: string; // brand-ok — glossary concept key
  type: ConceptEdgeType;
};

export type ConceptGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  generatedAt: string;
};

export function conceptGroupOf(id: string): string {
  // brand-ok — glossary concept key prefixing
  const parts = id.split('.');
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : (parts[0] ?? 'other');
}

export function conceptCategoryOf(id: string): string {
  // brand-ok — glossary concept key prefixing
  return id.split('.')[0] ?? 'other';
}

export function isConceptStatus(v: string): v is ConceptStatus {
  return (CONCEPT_STATUSES as readonly string[]).includes(v);
}

export function parseConceptStatus(raw: unknown, field = 'status'): ConceptStatus {
  if (typeof raw !== 'string' || !isConceptStatus(raw)) {
    throw new Error(`${field}: expected one of ${CONCEPT_STATUSES.join('|')}`);
  }
  return raw;
}

export function parseNonEmpty(raw: unknown, field: string): string {
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new Error(`${field}: expected non-empty string`);
  }
  return raw.trim();
}
