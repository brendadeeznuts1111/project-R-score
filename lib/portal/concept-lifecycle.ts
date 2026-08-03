// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
/**
 * Concept lifecycle engine — proposals, review, deprecation, archival.
 *
 * Store: `scripts/concept-lifecycle.json` (git-tracked, same precedent as
 * `scripts/concept-metadata-baseline.json`). Vocabulary source edits mirror
 * the regex approach of `scripts/concept-domain-backfill.ts`.
 *
 * CLIs: scripts/concept-{propose,review,deprecate,archive,history}.ts
 */
import { inferDomain, type ConceptDomain } from './concept-domains.ts';
import {
  PORTAL_SEMANTIC_CONCEPTS,
  PORTAL_SEMANTIC_TYPES,
  PORTAL_UI_ROLES,
  conceptStatusOf,
  inferPortalSemanticDomain,
  type PortalSemanticType,
  type PortalUiRole,
} from './semantic-vocabulary.ts';

export const DEFAULT_STORE_PATH = `${import.meta.dir}/../../scripts/concept-lifecycle.json`;
export const DEFAULT_VOCAB_PATH = `${import.meta.dir}/semantic-vocabulary.ts`;

// ── Store contract ───────────────────────────────────────────────────────────

export type ConceptProposalStatus = 'pending' | 'approved' | 'rejected';

export type ConceptHistoryAction = 'propose' | 'approve' | 'reject' | 'deprecate' | 'archive';

export type ConceptProposal = {
  id: string; // brand-ok — glossary concept key
  label: string;
  description: string;
  category: string;
  group: string;
  domain: string;
  unit?: string | null;
  color?: string | null;
  semanticType?: string | null;
  uiRole?: string | null;
  correlationId?: string | null; // brand-ok — provenance work-item ref, not CorrelationId UUID
  status: ConceptProposalStatus;
  proposedBy: string;
  proposedAt: string;
  /** Reviewer hint recorded at propose time (env CONCEPT_REVIEWER). */
  reviewer?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewReason?: string | null;
};

export type ConceptHistoryEvent = {
  at: string;
  action: ConceptHistoryAction;
  id: string; // brand-ok — glossary concept key
  actor: string;
  reason?: string | null;
  replaceBy?: string | null; // brand-ok — glossary concept key
};

export type ConceptLifecycleStore = {
  version: 1;
  proposals: ConceptProposal[];
  history: ConceptHistoryEvent[];
};

export function emptyLifecycleStore(): ConceptLifecycleStore {
  return { version: 1, proposals: [], history: [] };
}

export async function loadLifecycleStore(
  path: string = DEFAULT_STORE_PATH
): Promise<ConceptLifecycleStore> {
  const file = Bun.file(path);
  if (!(await file.exists())) return emptyLifecycleStore();
  const raw = (await file.json()) as Partial<ConceptLifecycleStore>;
  return {
    version: 1,
    proposals: Array.isArray(raw.proposals) ? (raw.proposals as ConceptProposal[]) : [],
    history: Array.isArray(raw.history) ? (raw.history as ConceptHistoryEvent[]) : [],
  };
}

export async function saveLifecycleStore(
  store: ConceptLifecycleStore,
  path: string = DEFAULT_STORE_PATH
): Promise<void> {
  await Bun.write(path, `${JSON.stringify(store, null, 2)}\n`);
}

/** Pure append — returns a new store, input untouched. */
export function appendHistory(
  store: ConceptLifecycleStore,
  event: ConceptHistoryEvent
): ConceptLifecycleStore {
  return { ...store, history: [...store.history, event] };
}

// ── Validation ───────────────────────────────────────────────────────────────

export const CONCEPT_ID_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/;

export type ConceptProposalInput = {
  id: string; // brand-ok — glossary concept key
  label?: string;
  description?: string;
  domain?: string;
};

/**
 * Validate a proposal against the live vocabulary and pending queue.
 * Returns a list of human-readable errors (empty = valid).
 */
export function validateProposal(
  input: ConceptProposalInput,
  store?: ConceptLifecycleStore,
  concepts: readonly { readonly id: string }[] = PORTAL_SEMANTIC_CONCEPTS // brand-ok — glossary concept key
): string[] {
  const errors: string[] = [];
  const id = input.id?.trim() ?? '';
  if (!CONCEPT_ID_PATTERN.test(id)) {
    errors.push(`invalid id "${input.id}" — must match ${CONCEPT_ID_PATTERN.source}`);
  }
  if (concepts.some(c => c.id === id)) {
    errors.push(`id "${id}" already exists in the portal semantic vocabulary`);
  }
  const inferred = CONCEPT_ID_PATTERN.test(id) ? inferPortalSemanticDomain(id) : undefined;
  if (!input.domain?.trim()) {
    errors.push('missing required --domain');
  } else if (inferred && input.domain.trim() !== inferred) {
    errors.push(`domain "${input.domain}" does not match id namespace "${inferred}"`);
  }
  if (!input.label?.trim()) errors.push('missing required --label');
  if (!input.description?.trim()) errors.push('missing required --summary/--description');
  if (store?.proposals.some(p => p.id === id && p.status === 'pending')) {
    errors.push(`a pending proposal for "${id}" already exists`);
  }
  return errors;
}

/** Validate a deprecation request against the live vocabulary. */
export function validateDeprecation(
  id: string, // brand-ok — glossary concept key
  replaceBy: string, // brand-ok — glossary concept key
  concepts: readonly {
    readonly id: string; // brand-ok — glossary concept key
    readonly status?: 'active' | 'deprecated' | 'archived';
  }[] = PORTAL_SEMANTIC_CONCEPTS
): string[] {
  const errors: string[] = [];
  const concept = concepts.find(c => c.id === id);
  if (!concept) errors.push(`unknown concept id "${id}"`);
  const replacement = concepts.find(c => c.id === replaceBy);
  if (!replacement) {
    errors.push(`unknown replacement id "${replaceBy}"`);
  } else if (conceptStatusOf(replacement) !== 'active') {
    errors.push(
      `replacement "${replaceBy}" is ${conceptStatusOf(replacement)} — pick an active concept`
    );
  }
  if (id === replaceBy) errors.push('a concept cannot replace itself');
  return errors;
}

// ── Vocabulary source editing ────────────────────────────────────────────────

export type ConceptVocabularyEntry = {
  id: string; // brand-ok — glossary concept key
  label: string;
  description: string;
  semanticType: PortalSemanticType;
  uiRole: PortalUiRole;
  namespace: string;
  domain?: ConceptDomain;
  synonyms?: readonly string[];
  seeAlso?: readonly string[];
  unit?: string;
  format?: string;
  correlationId?: string; // brand-ok — provenance work-item ref
  addedAt?: string;
};

const VOCAB_CLOSE_MARKER = '] as const satisfies readonly PortalSemanticConceptDef[];';

function tsStr(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function tsStrList(values: readonly string[]): string {
  return `[${values.map(tsStr).join(', ')}]`;
}

/** Render a concept object literal in the established vocabulary field order. */
export function formatConceptEntry(entry: ConceptVocabularyEntry): string {
  const lines = [
    `    id: ${tsStr(entry.id)},`,
    `    namespace: ${tsStr(entry.namespace)},`,
    `    domain: ${tsStr(entry.domain ?? inferDomain(entry.id))},`,
    `    label: ${tsStr(entry.label)},`,
    `    description: ${tsStr(entry.description)},`,
    `    semanticType: ${tsStr(entry.semanticType)},`,
    `    uiRole: ${tsStr(entry.uiRole)},`,
    `    synonyms: ${tsStrList(entry.synonyms ?? [])},`,
    `    seeAlso: ${tsStrList(entry.seeAlso ?? [])},`,
  ];
  if (entry.unit) lines.push(`    unit: ${tsStr(entry.unit)},`);
  if (entry.format) lines.push(`    format: ${tsStr(entry.format)},`);
  if (entry.correlationId) lines.push(`    correlationId: ${tsStr(entry.correlationId)},`);
  if (entry.addedAt) lines.push(`    addedAt: ${tsStr(entry.addedAt)},`);
  return `  {\n${lines.join('\n')}\n  },\n`;
}

/**
 * Insert a concept object literal into the vocabulary source, just before the
 * closing `] as const satisfies …` line. Returns the new source text.
 */
export function insertConceptIntoVocabularySource(
  source: string,
  entry: ConceptVocabularyEntry
): string {
  if (source.includes(`id: ${tsStr(entry.id)},`)) {
    throw new Error(`concept "${entry.id}" already present in vocabulary source`);
  }
  const at = source.indexOf(VOCAB_CLOSE_MARKER);
  if (at === -1) throw new Error(`vocabulary close marker not found: ${VOCAB_CLOSE_MARKER}`);
  return `${source.slice(0, at)}${formatConceptEntry(entry)}${source.slice(at)}`;
}

export async function insertConceptIntoVocabulary(
  entry: ConceptVocabularyEntry,
  sourcePath: string = DEFAULT_VOCAB_PATH
): Promise<void> {
  const source = await Bun.file(sourcePath).text();
  await Bun.write(sourcePath, insertConceptIntoVocabularySource(source, entry));
}

export type ConceptLifecyclePatch = {
  status: 'active' | 'deprecated' | 'archived';
  replacedBy?: string; // brand-ok — glossary concept key
  deprecatedAt?: string;
};

/**
 * Add/replace `status:` / `replacedBy:` / `deprecatedAt:` lines inside the
 * concept's object block in the vocabulary source. Keys absent from the patch
 * are left untouched (archiving keeps a prior `replacedBy`). Returns the new
 * source text.
 */
export function setConceptLifecycleInVocabularySource(
  source: string,
  id: string, // brand-ok — glossary concept key
  patch: ConceptLifecyclePatch
): string {
  const openMarker = `\n  {\n    id: ${tsStr(id)},`;
  const start = source.indexOf(openMarker);
  if (start === -1) throw new Error(`concept "${id}" not found in vocabulary source`);
  const from = start + openMarker.length;
  const closeComma = source.indexOf('\n  },', from);
  const closeBare = source.indexOf('\n  }', from);
  let close = -1;
  if (closeComma !== -1 && (closeBare === -1 || closeComma <= closeBare)) close = closeComma;
  else close = closeBare;
  if (close === -1) throw new Error(`concept "${id}" block close not found in vocabulary source`);

  let block = source.slice(start, close);
  const upsert = (key: string, value: string | undefined): void => {
    if (value === undefined) return;
    const lineRe = new RegExp(`\\n    ${key}: '[^']*',`);
    const line = `\n    ${key}: ${tsStr(value)},`;
    block = lineRe.test(block) ? block.replace(lineRe, line) : `${block}${line}`;
  };
  upsert('status', patch.status);
  upsert('replacedBy', patch.replacedBy);
  upsert('deprecatedAt', patch.deprecatedAt);

  return `${source.slice(0, start)}${block}${source.slice(close)}`;
}

export async function setConceptLifecycleInVocabulary(
  id: string, // brand-ok — glossary concept key
  patch: ConceptLifecyclePatch,
  sourcePath: string = DEFAULT_VOCAB_PATH
): Promise<void> {
  const source = await Bun.file(sourcePath).text();
  await Bun.write(sourcePath, setConceptLifecycleInVocabularySource(source, id, patch));
}

// ── Review helpers ───────────────────────────────────────────────────────────

/** Coerce a proposal's free-form semanticType/uiRole into vocabulary-safe values. */
export function vocabularyEntryFromProposal(
  proposal: ConceptProposal,
  overrides: { correlationId?: string; addedAt?: string } = {} // brand-ok — provenance work-item ref, not CorrelationId UUID
): ConceptVocabularyEntry {
  const semanticType = PORTAL_SEMANTIC_TYPES.includes(proposal.semanticType as PortalSemanticType)
    ? (proposal.semanticType as PortalSemanticType)
    : 'state';
  const uiRole = PORTAL_UI_ROLES.includes(proposal.uiRole as PortalUiRole)
    ? (proposal.uiRole as PortalUiRole)
    : 'token';
  return {
    id: proposal.id,
    label: proposal.label,
    description: proposal.description,
    semanticType,
    uiRole,
    namespace: proposal.domain,
    synonyms: [],
    seeAlso: [],
    unit: proposal.unit ?? undefined,
    correlationId: overrides.correlationId ?? proposal.correlationId ?? undefined,
    addedAt: overrides.addedAt,
  };
}

export function todayIsoDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
