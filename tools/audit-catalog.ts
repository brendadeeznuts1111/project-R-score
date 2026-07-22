#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
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
  return errors;
}

export async function writeAuditPages(
  findings: AuditFinding[],
  concepts: AuditConcept[]
): Promise<void> {
  for (const f of findings) {
    await Bun.write(joinPath(REPO_ROOT, auditFindingDocsPath(f.id)), renderAuditFindingMarkdown(f));
  }
  await Bun.write(joinPath(FINDING_PAGES_DIR, 'README.md'), renderAuditFindingsIndex(findings));
  for (const c of concepts) {
    await Bun.write(joinPath(REPO_ROOT, auditConceptDocsPath(c.id)), renderAuditConceptMarkdown(c));
  }
  await Bun.write(joinPath(CONCEPT_PAGES_DIR, 'README.md'), renderAuditConceptsIndex(concepts));
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

export async function buildAuditCatalog(): Promise<AuditCatalogFile> {
  const findings = await loadSourceFindings();
  const concepts = await loadSourceConcepts();
  const errors = [...(await verifyAllEvidence(findings)), ...verifyAuditGraph(findings, concepts)];
  if (errors.length > 0) {
    throw new Error(`audit catalog evidence failed:\n${errors.join('\n')}`);
  }
  await writeAuditPages(findings, concepts);
  const catalog = buildCatalogFile(findings, concepts);
  await Bun.write(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
  return catalog;
}

export async function verifyAuditCatalog(): Promise<{
  ok: boolean;
  errors: string[];
  count: number;
  conceptCount: number;
}> {
  const findings = await loadSourceFindings();
  const concepts = await loadSourceConcepts();
  const errors = [...(await verifyAllEvidence(findings)), ...verifyAuditGraph(findings, concepts)];
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
    return buildAuditCatalog();
  }
  const raw: unknown = await file.json();
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('audit-catalog.json: invalid shape');
  }
  const obj = raw as Record<string, unknown>;
  const findingsRaw = Array.isArray(obj.findings) ? obj.findings : [];
  const conceptsRaw = Array.isArray(obj.concepts) ? obj.concepts : [];
  const findings = findingsRaw.map(row => {
    const f = parseAuditFinding(row);
    return toFindingEntry(f);
  });
  const concepts = conceptsRaw.map(row => {
    const c = parseAuditConcept(row);
    return toConceptEntry(c);
  });
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

function entryBlob(e: {
  id: AuditFindingId | AuditConceptId;
  title: string;
  description: string;
  related?: AuditEntryId[];
}): string {
  return [e.id, e.title, e.description, ...(e.related ?? [])].join('\n').toLowerCase();
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
  return findings.filter(f => {
    if (normalizeFindingId(f.id) === normalizeFindingId(q)) return true;
    const blob = entryBlob(f);
    if (blob.includes(q)) return true;
    return tokens.every(t => blob.includes(t));
  });
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
  return concepts.filter(c => {
    if (normalizeFindingId(c.id) === normalizeFindingId(q)) return true;
    const blob = entryBlob(c);
    if (blob.includes(q)) return true;
    return tokens.every(t => blob.includes(t));
  });
}

/** Search findings + concepts; concepts preferred when alias hits a concept id. */
export function searchAuditCatalog(catalog: AuditCatalogFile, query: string): AuditCatalogEntry[] {
  const alias = resolveAuditAlias(query);
  if (alias) {
    const concept = catalog.concepts.find(
      c => normalizeFindingId(c.id) === normalizeFindingId(alias)
    );
    if (concept) return [concept];
    const finding = catalog.findings.find(
      f => normalizeFindingId(f.id) === normalizeFindingId(alias)
    );
    if (finding) return [finding];
  }
  const concepts = searchAuditConcepts(catalog.concepts, query);
  const findings = searchAuditFindings(catalog.findings, query);
  // Prefer concepts when both match the same query string loosely
  return [...concepts, ...findings];
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
      `✅ audit verify ok — ${result.count} findings, ${result.conceptCount} concepts, evidence + pages`
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
    printAuditEntry(hits[0]!);
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
