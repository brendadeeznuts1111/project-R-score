#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$ (tmp→catalog publish)
/**
 * Audit catalog — findings + concepts (sibling SSOT to bun-docs-catalog).
 *
 *   bun tools/audit-catalog.ts build|verify|list|get|search
 */
import { type AuditConcept, parseAuditConcept } from '../lib/audit/audit-concept.ts';
import {
  type AuditFinding,
  type AuditFindingStatus,
  parseAuditFinding,
  verifyEvidenceHash,
} from '../lib/audit/audit-finding.ts';
import {
  auditConceptDocsPath,
  auditFindingDocsPath,
  resolveAuditAlias,
} from '../lib/audit/audit-refs.ts';
import {
  renderAuditConceptMarkdown,
  renderAuditConceptsIndex,
  renderAuditFindingMarkdown,
  renderAuditFindingsIndex,
} from '../lib/audit/render-finding.ts';
import { joinPath } from '../lib/path-bun.ts';
import {
  type AuditConceptId,
  type AuditEntryId,
  type AuditFindingId,
} from '../lib/types/branded.ts';

const REPO_ROOT = joinPath(import.meta.dir, '..');
const FINDINGS_DIR = joinPath(REPO_ROOT, 'tools/audit-findings');
const CONCEPTS_DIR = joinPath(REPO_ROOT, 'tools/audit-concepts');
const CATALOG_PATH = joinPath(REPO_ROOT, 'tools/audit-catalog.json');
const CATALOG_TMP_PATH = `${CATALOG_PATH}.tmp`;
const FINDING_PAGES_DIR = joinPath(REPO_ROOT, 'docs/audit/findings');
const CONCEPT_PAGES_DIR = joinPath(REPO_ROOT, 'docs/audit/concepts');

export type AuditCatalogFinding = AuditFinding & { docsPath: string };
export type AuditCatalogConcept = AuditConcept & { docsPath: string };

export type AuditCatalogEntry = AuditCatalogFinding | AuditCatalogConcept;

export type AuditCatalogFile = {
  generated: string;
  bunVersion: string;
  count: number;
  conceptCount: number;
  byStatus: Record<AuditFindingStatus, number>;
  findings: AuditCatalogFinding[];
  concepts: AuditCatalogConcept[];
};

/** Single-flight rebuild when catalog missing/corrupt (parallel suggest --audit). */
let buildingCatalog: Promise<AuditCatalogFile> | null = null;

export function normalizeFindingId(
  id: AuditEntryId | AuditFindingId | AuditConceptId | string
): string {
  return String(id).trim().toLowerCase();
}

export function toFindingEntry(f: AuditFinding): AuditCatalogFinding {
  return { ...f, docsPath: auditFindingDocsPath(f.id) };
}

export function toConceptEntry(c: AuditConcept): AuditCatalogConcept {
  return { ...c, docsPath: auditConceptDocsPath(c.id) };
}

export function tallyByStatus(findings: AuditFinding[]): Record<AuditFindingStatus, number> {
  const byStatus: Record<AuditFindingStatus, number> = {
    confirmed: 0,
    mitigated: 0,
    open: 0,
  };
  for (const f of findings) byStatus[f.status]++;
  return byStatus;
}

async function loadJsonDir<T extends { id: AuditFindingId | AuditConceptId }>(
  dir: string,
  parse: (raw: unknown) => T,
  label: string
): Promise<T[]> {
  const glob = new Bun.Glob('*.json');
  const out: T[] = [];
  const seen = new Map<string, string>();
  for await (const name of glob.scan({ cwd: dir, onlyFiles: true })) {
    const path = joinPath(dir, name);
    const raw: unknown = await Bun.file(path).json();
    const item = parse(raw);
    const key = normalizeFindingId(item.id);
    const prev = seen.get(key);
    if (prev) {
      throw new Error(`duplicate audit ${label} id "${item.id}" in ${prev} and ${name}`);
    }
    seen.set(key, name);
    out.push(item);
  }
  out.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return out;
}

export async function loadSourceFindings(): Promise<AuditFinding[]> {
  return loadJsonDir(FINDINGS_DIR, parseAuditFinding, 'finding');
}

export async function loadSourceConcepts(): Promise<AuditConcept[]> {
  return loadJsonDir(CONCEPTS_DIR, parseAuditConcept, 'concept');
}

export async function verifyAllEvidence(
  findings: AuditFinding[],
  repoRoot: string = REPO_ROOT
): Promise<string[]> {
  const errors: string[] = [];
  for (const f of findings) {
    const result = await verifyEvidenceHash(f, repoRoot);
    if (!result.ok) errors.push(`${f.id}: ${result.reason}`);
  }
  return errors;
}

/** Unique ids across findings+concepts; `related` must resolve to an existing entry. */
export function verifyAuditGraph(findings: AuditFinding[], concepts: AuditConcept[]): string[] {
  const errors: string[] = [];
  const ids = new Map<string, 'finding' | 'concept'>();
  for (const f of findings) {
    const key = normalizeFindingId(f.id);
    if (ids.has(key)) errors.push(`duplicate audit id "${f.id}" (finding vs prior entry)`);
    else ids.set(key, 'finding');
  }
  for (const c of concepts) {
    const key = normalizeFindingId(c.id);
    if (ids.has(key)) {
      errors.push(`duplicate audit id "${c.id}" (${ids.get(key)} vs concept)`);
    } else ids.set(key, 'concept');
  }
  const checkRelated = (
    ownerId: AuditFindingId | AuditConceptId,
    related: AuditEntryId[] | undefined
  ): void => {
    for (const r of related ?? []) {
      if (!ids.has(normalizeFindingId(r))) {
        errors.push(`${ownerId}: related "${r}" is not an AuditFinding or AuditConcept id`);
      }
    }
  };
  for (const f of findings) checkRelated(f.id, f.related);
  for (const c of concepts) checkRelated(c.id, c.related);

  // Every SSOT id must have an AUDIT_REFS identity alias (id → itself)
  for (const id of ids.keys()) {
    const resolved = resolveAuditAlias(id);
    if (!resolved || normalizeFindingId(resolved) !== id) {
      errors.push(`${id}: missing AUDIT_REFS identity alias (add "${id}" → itself)`);
    }
  }
  return errors;
}

/** relatedDocs tokens must resolve via bun-docs-curated (CLI-free). */
export function verifyRelatedDocs(
  findings: AuditFinding[],
  concepts: AuditConcept[],
  resolves: (token: string) => boolean
): string[] {
  const errors: string[] = [];
  const check = (
    ownerId: AuditFindingId | AuditConceptId,
    relatedDocs: string[] | undefined
  ): void => {
    for (const token of relatedDocs ?? []) {
      if (!resolves(token)) {
        errors.push(`${ownerId}: relatedDocs "${token}" is not a curated term (bun-docs-curated)`);
      }
    }
  };
  for (const f of findings) check(f.id, f.relatedDocs);
  for (const c of concepts) check(c.id, c.relatedDocs);
  return errors;
}

async function pruneOrphanPages(
  keepFindingNames: ReadonlySet<string>,
  keepConceptNames: ReadonlySet<string>
): Promise<void> {
  const glob = new Bun.Glob('*.md');
  for await (const name of glob.scan({ cwd: FINDING_PAGES_DIR, onlyFiles: true })) {
    if (name === 'README.md' || keepFindingNames.has(name)) continue;
    await Bun.file(joinPath(FINDING_PAGES_DIR, name)).unlink();
  }
  for await (const name of glob.scan({ cwd: CONCEPT_PAGES_DIR, onlyFiles: true })) {
    if (name === 'README.md' || keepConceptNames.has(name)) continue;
    await Bun.file(joinPath(CONCEPT_PAGES_DIR, name)).unlink();
  }
}

export async function writeAuditPages(
  findings: AuditFinding[],
  concepts: AuditConcept[]
): Promise<void> {
  const ctx = {
    findingIds: new Set(findings.map(f => normalizeFindingId(f.id))),
  };
  const keepFindings = new Set(findings.map(f => `${normalizeFindingId(f.id)}.md`));
  const keepConcepts = new Set(concepts.map(c => `${normalizeFindingId(c.id)}.md`));
  for (const f of findings) {
    await Bun.write(
      joinPath(REPO_ROOT, auditFindingDocsPath(f.id)),
      renderAuditFindingMarkdown(f, ctx)
    );
  }
  await Bun.write(joinPath(FINDING_PAGES_DIR, 'README.md'), renderAuditFindingsIndex(findings));
  for (const c of concepts) {
    await Bun.write(
      joinPath(REPO_ROOT, auditConceptDocsPath(c.id)),
      renderAuditConceptMarkdown(c, ctx)
    );
  }
  await Bun.write(joinPath(CONCEPT_PAGES_DIR, 'README.md'), renderAuditConceptsIndex(concepts));
  await pruneOrphanPages(keepFindings, keepConcepts);
}

export function buildCatalogFile(
  findings: AuditFinding[],
  concepts: AuditConcept[]
): AuditCatalogFile {
  return {
    generated: new Date().toISOString(),
    bunVersion: Bun.version,
    count: findings.length,
    conceptCount: concepts.length,
    byStatus: tallyByStatus(findings),
    findings: findings.map(toFindingEntry),
    concepts: concepts.map(toConceptEntry),
  };
}

/**
 * Resolve relatedDocs via curated only — never import bun-doc-refs.ts here.
 * Dynamic import of bun-doc-refs from audit-catalog deadlocks when suggest
 * (import.meta.main on bun-doc-refs) auto-builds a missing catalog.
 */
async function relatedDocsResolver(): Promise<(token: string) => boolean> {
  const { getCuratedEntry } = await import('./bun-docs-curated.ts');
  return (token: string) => Boolean(getCuratedEntry(token));
}

function catalogPayloadKey(catalog: AuditCatalogFile): string {
  // Ignore generated/bunVersion churn — only republish when entries change.
  return JSON.stringify({
    count: catalog.count,
    conceptCount: catalog.conceptCount,
    byStatus: catalog.byStatus,
    findings: catalog.findings,
    concepts: catalog.concepts,
  });
}

async function writeCatalogAtomic(catalog: AuditCatalogFile): Promise<void> {
  const existing = Bun.file(CATALOG_PATH);
  if (await existing.exists()) {
    try {
      const prev = parseAuditCatalogRaw(await existing.json());
      if (catalogPayloadKey(prev) === catalogPayloadKey(catalog)) {
        return;
      }
    } catch {
      // rewrite on corrupt prior
    }
  }
  await Bun.write(CATALOG_TMP_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
  // Same-dir rename via mv — readers never see a torn JSON write.
  const moved = await Bun.$`mv ${CATALOG_TMP_PATH} ${CATALOG_PATH}`.nothrow();
  if (moved.exitCode !== 0) {
    throw new Error(`audit-catalog.json: atomic publish failed (mv exit ${moved.exitCode})`);
  }
}

export async function buildAuditCatalog(): Promise<AuditCatalogFile> {
  if (buildingCatalog) return buildingCatalog;
  buildingCatalog = (async () => {
    const findings = await loadSourceFindings();
    const concepts = await loadSourceConcepts();
    const resolves = await relatedDocsResolver();
    const errors = [
      ...(await verifyAllEvidence(findings)),
      ...verifyAuditGraph(findings, concepts),
      ...verifyRelatedDocs(findings, concepts, resolves),
    ];
    if (errors.length > 0) {
      throw new Error(`audit catalog evidence failed:\n${errors.join('\n')}`);
    }
    await writeAuditPages(findings, concepts);
    const catalog = buildCatalogFile(findings, concepts);
    await writeCatalogAtomic(catalog);
    return catalog;
  })().finally(() => {
    buildingCatalog = null;
  });
  return buildingCatalog;
}

/** Strict parse — never soft-coerce missing findings/concepts to []. */
export function parseAuditCatalogRaw(raw: unknown): AuditCatalogFile {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('audit-catalog.json: invalid shape');
  }
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.findings) || !Array.isArray(obj.concepts)) {
    throw new Error('audit-catalog.json: findings and concepts must be arrays');
  }
  const findings = obj.findings.map(row => toFindingEntry(parseAuditFinding(row)));
  const concepts = obj.concepts.map(row => toConceptEntry(parseAuditConcept(row)));
  const generated = typeof obj.generated === 'string' ? obj.generated : new Date(0).toISOString();
  const bunVersion = typeof obj.bunVersion === 'string' ? obj.bunVersion : Bun.version;
  return {
    generated,
    bunVersion,
    count: findings.length,
    conceptCount: concepts.length,
    byStatus: tallyByStatus(findings),
    findings,
    concepts,
  };
}

function stableJson(value: object | string | number | boolean | null | undefined): string {
  return JSON.stringify(value ?? null);
}

function findingSnapshot(f: AuditFinding): string {
  return stableJson({
    id: normalizeFindingId(f.id),
    kind: f.kind,
    title: f.title,
    description: f.description,
    status: f.status,
    publishedAt: f.publishedAt,
    since: f.since,
    discoveredIn: f.discoveredIn,
    mitigatedIn: f.mitigatedIn,
    evidence: f.evidence,
    related: f.related,
    relatedDocs: f.relatedDocs,
    meta: f.meta,
  });
}

function conceptSnapshot(c: AuditConcept): string {
  return stableJson({
    id: normalizeFindingId(c.id),
    kind: c.kind,
    title: c.title,
    description: c.description,
    publishedAt: c.publishedAt,
    since: c.since,
    references: c.references,
    related: c.related,
    relatedDocs: c.relatedDocs,
    meta: c.meta,
  });
}

export function verifyCatalogParity(
  sources: { findings: AuditFinding[]; concepts: AuditConcept[] },
  catalog: AuditCatalogFile
): string[] {
  const errors: string[] = [];
  const srcF = new Set(sources.findings.map(f => normalizeFindingId(f.id)));
  const catF = new Set(catalog.findings.map(f => normalizeFindingId(f.id)));
  const srcC = new Set(sources.concepts.map(c => normalizeFindingId(c.id)));
  const catC = new Set(catalog.concepts.map(c => normalizeFindingId(c.id)));
  for (const id of srcF) {
    if (!catF.has(id)) errors.push(`catalog missing finding ${id} (run build)`);
  }
  for (const id of catF) {
    if (!srcF.has(id)) errors.push(`catalog stale finding ${id} (run build)`);
  }
  for (const id of srcC) {
    if (!catC.has(id)) errors.push(`catalog missing concept ${id} (run build)`);
  }
  for (const id of catC) {
    if (!srcC.has(id)) errors.push(`catalog stale concept ${id} (run build)`);
  }
  if (catalog.count !== sources.findings.length) {
    errors.push(`catalog.count ${catalog.count} ≠ sources ${sources.findings.length} (run build)`);
  }
  if (catalog.conceptCount !== sources.concepts.length) {
    errors.push(
      `catalog.conceptCount ${catalog.conceptCount} ≠ sources ${sources.concepts.length} (run build)`
    );
  }
  const expectedStatus = tallyByStatus(sources.findings);
  if (stableJson(catalog.byStatus) !== stableJson(expectedStatus)) {
    errors.push('catalog.byStatus mismatch (run build)');
  }
  for (const f of sources.findings) {
    const row = catalog.findings.find(c => normalizeFindingId(c.id) === normalizeFindingId(f.id));
    if (!row) continue;
    if (findingSnapshot(f) !== findingSnapshot(row)) {
      errors.push(`${f.id}: catalog entry drift (run build)`);
    }
  }
  for (const c of sources.concepts) {
    const row = catalog.concepts.find(x => normalizeFindingId(x.id) === normalizeFindingId(c.id));
    if (!row) continue;
    if (conceptSnapshot(c) !== conceptSnapshot(row)) {
      errors.push(`${c.id}: catalog entry drift (run build)`);
    }
  }
  return errors;
}

export async function verifyOrphanPages(
  findings: AuditFinding[],
  concepts: AuditConcept[]
): Promise<string[]> {
  const errors: string[] = [];
  const findingPages = new Set(findings.map(f => `${normalizeFindingId(f.id)}.md`));
  const conceptPages = new Set(concepts.map(c => `${normalizeFindingId(c.id)}.md`));
  const glob = new Bun.Glob('*.md');
  for await (const name of glob.scan({ cwd: FINDING_PAGES_DIR, onlyFiles: true })) {
    if (name === 'README.md') continue;
    if (!findingPages.has(name)) {
      errors.push(`orphan finding page docs/audit/findings/${name} (run build to prune)`);
    }
  }
  for await (const name of glob.scan({ cwd: CONCEPT_PAGES_DIR, onlyFiles: true })) {
    if (name === 'README.md') continue;
    if (!conceptPages.has(name)) {
      errors.push(`orphan concept page docs/audit/concepts/${name} (run build to prune)`);
    }
  }
  return errors;
}

export async function verifyPageContent(
  findings: AuditFinding[],
  concepts: AuditConcept[]
): Promise<string[]> {
  const errors: string[] = [];
  const ctx = {
    findingIds: new Set(findings.map(f => normalizeFindingId(f.id))),
  };
  for (const f of findings) {
    const path = joinPath(REPO_ROOT, auditFindingDocsPath(f.id));
    const file = Bun.file(path);
    if (!(await file.exists())) continue;
    if ((await file.text()) !== renderAuditFindingMarkdown(f, ctx)) {
      errors.push(`${f.id}: docs page drift (run build)`);
    }
  }
  for (const c of concepts) {
    const path = joinPath(REPO_ROOT, auditConceptDocsPath(c.id));
    const file = Bun.file(path);
    if (!(await file.exists())) continue;
    if ((await file.text()) !== renderAuditConceptMarkdown(c, ctx)) {
      errors.push(`${c.id}: docs page drift (run build)`);
    }
  }
  const findingsIndex = joinPath(FINDING_PAGES_DIR, 'README.md');
  if (await Bun.file(findingsIndex).exists()) {
    if ((await Bun.file(findingsIndex).text()) !== renderAuditFindingsIndex(findings)) {
      errors.push('docs/audit/findings/README.md drift (run build)');
    }
  }
  const conceptsIndex = joinPath(CONCEPT_PAGES_DIR, 'README.md');
  if (await Bun.file(conceptsIndex).exists()) {
    if ((await Bun.file(conceptsIndex).text()) !== renderAuditConceptsIndex(concepts)) {
      errors.push('docs/audit/concepts/README.md drift (run build)');
    }
  }
  return errors;
}

export async function verifyAuditCatalog(): Promise<{
  ok: boolean;
  errors: string[];
  count: number;
  conceptCount: number;
}> {
  const findings = await loadSourceFindings();
  const concepts = await loadSourceConcepts();
  const resolves = await relatedDocsResolver();
  const errors = [
    ...(await verifyAllEvidence(findings)),
    ...verifyAuditGraph(findings, concepts),
    ...verifyRelatedDocs(findings, concepts, resolves),
  ];
  for (const f of findings) {
    const page = joinPath(REPO_ROOT, auditFindingDocsPath(f.id));
    if (!(await Bun.file(page).exists())) {
      errors.push(`${f.id}: missing docs page ${auditFindingDocsPath(f.id)} (run build)`);
    }
  }
  for (const c of concepts) {
    const page = joinPath(REPO_ROOT, auditConceptDocsPath(c.id));
    if (!(await Bun.file(page).exists())) {
      errors.push(`${c.id}: missing docs page ${auditConceptDocsPath(c.id)} (run build)`);
    }
  }
  errors.push(...(await verifyOrphanPages(findings, concepts)));
  errors.push(...(await verifyPageContent(findings, concepts)));

  const catalogFile = Bun.file(CATALOG_PATH);
  if (!(await catalogFile.exists())) {
    errors.push('tools/audit-catalog.json missing (run build)');
  } else {
    try {
      const catalog = parseAuditCatalogRaw(await catalogFile.json());
      errors.push(...verifyCatalogParity({ findings, concepts }, catalog));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`tools/audit-catalog.json: ${msg}`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    count: findings.length,
    conceptCount: concepts.length,
  };
}

export async function loadAuditCatalog(): Promise<AuditCatalogFile> {
  const file = Bun.file(CATALOG_PATH);
  if (!(await file.exists())) {
    // Missing catalog: rebuild once (suggest --audit ergonomics). Corrupt catalogs must not silent-write.
    return buildAuditCatalog();
  }
  try {
    return parseAuditCatalogRaw(await file.json());
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `tools/audit-catalog.json corrupt or invalid (${msg}). Run: bun run audit:catalog:build`
    );
  }
}

function entryBlob(e: {
  id: AuditFindingId | AuditConceptId;
  title: string;
  description: string;
  related?: AuditEntryId[];
  relatedDocs?: string[];
}): string {
  return [e.id, e.title, e.description, ...(e.related ?? []), ...(e.relatedDocs ?? [])]
    .join('\n')
    .toLowerCase();
}

/** Higher = better. Exact relatedDocs / id beats description substring. */
function scoreAuditHit(
  e: {
    id: AuditFindingId | AuditConceptId;
    title: string;
    description: string;
    related?: AuditEntryId[];
    relatedDocs?: string[];
  },
  q: string
): number {
  const id = normalizeFindingId(e.id);
  const qn = normalizeFindingId(q);
  if (id === qn) return 100;
  if (e.relatedDocs?.some(d => d.trim().toLowerCase() === q)) return 90;
  if (e.title.trim().toLowerCase() === q) return 80;
  if (e.relatedDocs?.some(d => d.toLowerCase().includes(q))) return 70;
  if (id.includes(qn) || e.title.toLowerCase().includes(q)) return 50;
  return 10;
}

function rankHits<
  T extends {
    id: AuditFindingId | AuditConceptId;
    title: string;
    description: string;
    related?: AuditEntryId[];
    relatedDocs?: string[];
  },
>(hits: T[], q: string): T[] {
  return [...hits].sort((a, b) => scoreAuditHit(b, q) - scoreAuditHit(a, q));
}

export function searchAuditFindings(findings: AuditFinding[], query: string): AuditFinding[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const aliasId = resolveAuditAlias(query);
  if (aliasId) {
    const hit = findings.find(f => normalizeFindingId(f.id) === normalizeFindingId(aliasId));
    if (hit) return [hit];
  }
  const tokens = q.split(/\s+/).filter(Boolean);
  const hits = findings.filter(f => {
    if (normalizeFindingId(f.id) === normalizeFindingId(q)) return true;
    const blob = entryBlob(f);
    if (blob.includes(q)) return true;
    return tokens.every(t => blob.includes(t));
  });
  return rankHits(hits, q);
}

export function searchAuditConcepts(concepts: AuditConcept[], query: string): AuditConcept[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const aliasId = resolveAuditAlias(query);
  if (aliasId) {
    const hit = concepts.find(c => normalizeFindingId(c.id) === normalizeFindingId(aliasId));
    if (hit) return [hit];
  }
  const tokens = q.split(/\s+/).filter(Boolean);
  const hits = concepts.filter(c => {
    if (normalizeFindingId(c.id) === normalizeFindingId(q)) return true;
    const blob = entryBlob(c);
    if (blob.includes(q)) return true;
    return tokens.every(t => blob.includes(t));
  });
  return rankHits(hits, q);
}

/** Search findings + concepts; concepts preferred when alias hits a concept id. */
export function searchAuditCatalog(catalog: AuditCatalogFile, query: string): AuditCatalogEntry[] {
  const q = query.trim().toLowerCase();
  const alias = resolveAuditAlias(query);
  if (alias) {
    const aliasKey = normalizeFindingId(alias);
    const concept = catalog.concepts.find(c => normalizeFindingId(c.id) === aliasKey);
    const finding = catalog.findings.find(f => normalizeFindingId(f.id) === aliasKey);
    const primary = concept ?? finding;
    if (primary) {
      // Co-hits: findings that relate to the alias id or list the query in relatedDocs
      const relatedFindings = catalog.findings.filter(f => {
        if (normalizeFindingId(f.id) === normalizeFindingId(primary.id)) return false;
        if (f.related?.some(r => normalizeFindingId(r) === aliasKey)) return true;
        if (q && f.relatedDocs?.some(d => d.trim().toLowerCase() === q)) return true;
        return false;
      });
      return [primary, ...relatedFindings];
    }
  }
  const concepts = searchAuditConcepts(catalog.concepts, query);
  const findings = searchAuditFindings(catalog.findings, query);
  return rankHits([...concepts, ...findings], q);
}

export function getAuditFinding(
  findings: AuditFinding[],
  id: AuditEntryId | AuditFindingId | string
): AuditFinding | undefined {
  const alias = resolveAuditAlias(String(id));
  const key = normalizeFindingId(alias ?? id);
  return findings.find(f => normalizeFindingId(f.id) === key);
}

export function getAuditConcept(
  concepts: AuditConcept[],
  id: AuditEntryId | AuditConceptId | string
): AuditConcept | undefined {
  const alias = resolveAuditAlias(String(id));
  const key = normalizeFindingId(alias ?? id);
  return concepts.find(c => normalizeFindingId(c.id) === key);
}

export function printAuditFinding(f: AuditFinding | AuditCatalogFinding): void {
  const docsPath =
    'docsPath' in f && typeof f.docsPath === 'string' ? f.docsPath : auditFindingDocsPath(f.id);
  console.info(`id: ${f.id}`);
  console.info(`kind: ${f.kind}`);
  console.info(`status: ${f.status}`);
  console.info(`since: ${f.since ?? 'unknown'}`);
  if (f.discoveredIn) console.info(`discoveredIn: ${f.discoveredIn}`);
  if (f.mitigatedIn) console.info(`mitigatedIn: ${f.mitigatedIn}`);
  console.info(`publishedAt: ${f.publishedAt}`);
  console.info(`title: ${f.title}`);
  console.info(`description: ${f.description}`);
  console.info(`docs: ${docsPath}`);
  console.info(`evidence: ${f.evidence.path}`);
  console.info(`evidence.algorithm: ${f.evidence.algorithm}`);
  console.info(`evidence.digest: ${f.evidence.digest}`);
  console.info(`evidence.mediaType: ${f.evidence.mediaType}`);
  if (f.related?.length) console.info(`related: ${f.related.join(', ')}`);
  if (f.relatedDocs?.length) console.info(`relatedDocs: ${f.relatedDocs.join(', ')}`);
  if (f.meta?.buildPin) console.info(`meta.buildPin: ${f.meta.buildPin}`);
  if (f.meta?.emitter) console.info(`meta.emitter: ${f.meta.emitter}`);
}

export function printAuditConcept(c: AuditConcept | AuditCatalogConcept): void {
  const docsPath =
    'docsPath' in c && typeof c.docsPath === 'string' ? c.docsPath : auditConceptDocsPath(c.id);
  console.info(`id: ${c.id}`);
  console.info(`kind: ${c.kind}`);
  console.info(`since: ${c.since ?? 'unknown'}`);
  console.info(`publishedAt: ${c.publishedAt}`);
  console.info(`title: ${c.title}`);
  console.info(`description: ${c.description}`);
  console.info(`docs: ${docsPath}`);
  if (c.references?.length) console.info(`references: ${c.references.join(' · ')}`);
  if (c.related?.length) console.info(`related: ${c.related.join(', ')}`);
  if (c.relatedDocs?.length) console.info(`relatedDocs: ${c.relatedDocs.join(', ')}`);
  if (c.meta?.buildPin) console.info(`meta.buildPin: ${c.meta.buildPin}`);
  if (c.meta?.emitter) console.info(`meta.emitter: ${c.meta.emitter}`);
}

export function printAuditEntry(e: AuditCatalogEntry): void {
  if (e.kind === 'AuditConcept') printAuditConcept(e);
  else printAuditFinding(e);
  // Reverse handoff: audit relatedDocs → BunToken / curated suggest
  if (e.relatedDocs?.length) {
    console.info(
      `  also try: bun tools/bun-doc-refs.ts suggest "${e.relatedDocs[0]}"  (BunToken / curated)`
    );
  }
}

async function main(): Promise<void> {
  const [cmd, ...rest] = Bun.argv.slice(2);
  if (!cmd || cmd === 'help' || cmd === '--help') {
    console.error('usage: bun tools/audit-catalog.ts build|verify|list|get <id>|search <query>');
    process.exit(cmd ? 0 : 1);
  }
  if (cmd === 'build') {
    const catalog = await buildAuditCatalog();
    console.info(
      `✅ audit catalog ${catalog.count} findings + ${catalog.conceptCount} concepts → tools/audit-catalog.json` +
        `  (confirmed=${catalog.byStatus.confirmed} mitigated=${catalog.byStatus.mitigated} open=${catalog.byStatus.open})`
    );
    console.info(`✅ wrote docs/audit/findings/ and docs/audit/concepts/`);
    return;
  }
  if (cmd === 'verify') {
    const result = await verifyAuditCatalog();
    if (!result.ok) {
      console.error(`❌ audit verify failed (${result.errors.length}):`);
      for (const e of result.errors) console.error(`  ${e}`);
      process.exit(1);
    }
    console.info(
      `✅ audit verify ok — ${result.count} findings, ${result.conceptCount} concepts` +
        ` (evidence · graph · relatedDocs · pages · orphans · catalog parity)`
    );
    return;
  }
  const catalog = await loadAuditCatalog();
  if (cmd === 'list') {
    for (const c of catalog.concepts) {
      console.info(`${c.id}\t${c.kind}\t${c.docsPath}\t${c.title}`);
    }
    for (const f of catalog.findings) {
      console.info(`${f.id}\t${f.kind}\t${f.status}\t${f.docsPath}\t${f.title}`);
    }
    return;
  }
  if (cmd === 'get') {
    const id = rest.join(' ').trim();
    if (!id) {
      console.error('usage: bun tools/audit-catalog.ts get <id>');
      process.exit(1);
    }
    const hits = searchAuditCatalog(catalog, id);
    if (hits.length === 0) {
      console.error(`❌ not in audit catalog: ${id}`);
      process.exit(1);
    }
    // Print all hits (alias co-hits: concept + related findings)
    for (let i = 0; i < hits.length; i++) {
      printAuditEntry(hits[i]!);
      if (i < hits.length - 1) console.info('---');
    }
    return;
  }
  if (cmd === 'search') {
    const q = rest.join(' ').trim();
    if (!q) {
      console.error('usage: bun tools/audit-catalog.ts search <query>');
      process.exit(1);
    }
    const hits = searchAuditCatalog(catalog, q);
    if (hits.length === 0) {
      console.info(`❌ no audit entries for "${q}"`);
      process.exit(1);
    }
    for (const e of hits) {
      printAuditEntry(e);
      console.info('---');
    }
    return;
  }
  console.error(`unknown command: ${cmd}`);
  process.exit(1);
}

if (import.meta.main) {
  await main();
}
