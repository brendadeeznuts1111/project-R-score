// lib/concept-registry/types.ts — Concept Registry row types + wire schemas.
//
// Row types are the interior domain model (typed after the boundary). Zod
// schemas live here because they parse *at* the boundary (HTTP query/body and
// the committed bake JSON file) — interior code consumes the parsed row
// types, never `unknown`.
//
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite (row materialization)
import { z } from 'zod';

import type { ConceptRegistryStatus, ConceptReviewStatus } from './schema.ts';

// ─── interior row types ──────────────────────────────────────────────────────

export type ConceptRegistryRow = {
  id: string; // brand-ok — glossary concept key
  label: string;
  description: string | null;
  kind: string | null;
  category: string | null;
  groupPrefix: string | null;
  status: ConceptRegistryStatus;
  color: string | null;
  unit: string | null;
  format: string | null;
  mapsTo: string | null;
  seeAlso: string[]; // brand-ok — glossary concept keys
  synonyms: string[];
  values: string[];
  url: string | null;
  deprecatedBy: string | null;
  source: string | null;
  createdAt: string;
  updatedAt: string;
  deprecatedAt: string | null;
};

export type ConceptVersionRow = {
  id: number;
  conceptId: string; // brand-ok — glossary concept key
  version: number;
  snapshot: Record<string, unknown>;
  author: string | null;
  createdAt: string;
};

export type ConceptUsageRow = {
  id: number;
  conceptId: string; // brand-ok — glossary concept key
  board: string;
  filePath: string;
  count: number;
  lastSeenAt: string;
};

export type ConceptProvenanceRow = {
  id: number;
  conceptId: string; // brand-ok — glossary concept key
  correlationId: string | null; // brand-ok — work-item provenance ref, not CorrelationId UUID
  author: string | null;
  committedAt: string;
};

export type ConceptReviewRow = {
  id: number;
  conceptId: string; // brand-ok — glossary concept key
  status: ConceptReviewStatus;
  reviewer: string | null;
  reviewedAt: string;
  comments: string | null;
};

export type ConceptGraphNode = {
  id: string; // brand-ok — glossary concept key
  label: string;
  group: string | null;
  category: string | null;
  status: ConceptRegistryStatus;
};

export type ConceptGraphEdge = {
  source: string; // brand-ok — glossary concept key
  target: string; // brand-ok — glossary concept key (may be unresolvable: targetExists=false)
  type: 'seeAlso' | 'mapsTo' | 'deprecatedBy';
  targetExists: boolean;
};

export type ConceptGraph = {
  nodes: ConceptGraphNode[];
  edges: ConceptGraphEdge[];
  summary: {
    nodes: number;
    edges: number;
    orphaned: number;
    central: Array<{ id: string; degree: number }>; // brand-ok — glossary concept key
    staleTargets: number;
  };
};

export type ConceptListFilters = {
  status?: ConceptRegistryStatus;
  category?: string;
  group?: string;
  limit: number;
  offset: number;
};

// ─── boundary schemas (HTTP + bake file) ─────────────────────────────────────

const conceptKey = z
  .string()
  .min(1)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/, 'invalid concept key');
const csvArray = z
  .string()
  .optional()
  .transform(v =>
    v === undefined || v === ''
      ? []
      : v
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
  );

export const ConceptListQuerySchema = z.object({
  status: z.enum(['proposed', 'active', 'deprecated', 'archived']).optional(),
  category: z.string().min(1).optional(),
  group: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export const ConceptProposeBodySchema = z.object({
  id: conceptKey,
  label: z.string().min(1),
  description: z.string().optional(),
  kind: z.string().optional(),
  category: z.string().optional(),
  groupPrefix: z.string().optional(),
  color: z.string().optional(),
  unit: z.string().optional(),
  format: z.string().optional(),
  mapsTo: z.string().optional(),
  seeAlso: csvArray,
  synonyms: csvArray,
  values: csvArray,
  url: z.string().optional(),
});

export const ConceptApproveBodySchema = z.object({
  reviewer: z.string().min(1).optional(),
  comments: z.string().optional(),
});

export const ConceptRejectBodySchema = ConceptApproveBodySchema;

export const ConceptDeprecateBodySchema = z.object({
  replaceBy: conceptKey.optional(),
});

export const ConceptArchiveBodySchema = z.object({
  force: z.boolean().default(false),
});

export const BakeConceptSchema = z.object({
  id: conceptKey,
  label: z.string().min(1).nullable().optional(),
  description: z.string().nullable().optional(),
  kind: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  status: z.enum(['active', 'deprecated']).optional(),
  color: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  mapsTo: z.string().nullable().optional(),
  seeAlso: z.array(conceptKey).nullable().optional(),
  synonyms: z.array(z.string()).nullable().optional(),
  values: z.array(z.string()).nullable().optional(),
  url: z.string().nullable().optional(),
  deprecatedBy: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
});

export const BakeFileSchema = z.object({
  concepts: z.array(BakeConceptSchema),
});
