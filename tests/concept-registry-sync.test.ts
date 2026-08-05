// @see https://bun.com/docs/test — bun:test
// tests/concept-registry-sync.test.ts — Auto-sync with Code + graph CLI (Phase 2).
// In-memory DB per test; migration seeded from the real bake + vocabulary.

import { beforeEach, describe, expect, test } from 'bun:test';

import { migrateConceptRegistry } from '../lib/concept-registry/migrate.ts';
import {
  buildConceptGraph,
  findOrphanUsage,
  recordConceptUsage,
  syncConceptUsage,
  unusedConceptCandidates,
} from '../lib/concept-registry/repo.ts';
import { renderConceptGraphMermaid } from '../lib/concept-registry/render.ts';
import { openConceptRegistryDb } from '../lib/concept-registry/schema.ts';

import type { Database } from 'bun:sqlite';

let db: Database;

beforeEach(async () => {
  db = openConceptRegistryDb(':memory:');
  await migrateConceptRegistry(db);
});

describe('concept registry auto-sync', () => {
  test('syncs real portal HTML with no literal orphan keys', async () => {
    const report = await syncConceptUsage(db);
    expect(report.scannedFiles).toBeGreaterThan(0);
    expect(report.usageRows).toBeGreaterThan(0);
    expect(report.orphanUsage).toEqual([]);
  });

  test('excludes template expressions and flags literal keys missing from the glossary', async () => {
    const fixture = '.tmp/sync-fixture';
    const tmplExpr = '${G.limits}';
    const html =
      `<section data-glossary-concept="${tmplExpr}"></section>` +
      `<span data-glossary-concept="ui.semantic.surface"></span>` +
      `<i data-glossary-concept="ops.ghost.key"></i>`;
    await Bun.write(`${fixture}/board.html`, html);

    const report = await syncConceptUsage(db, fixture);
    // ${G.limits} is a runtime-resolved template expression — excluded.
    expect(report.usageRows).toBe(2);
    expect(report.orphanUsage.some(o => o.key === 'ops.ghost.key')).toBe(true);
    const ghost = report.orphanUsage.find(o => o.key === 'ops.ghost.key');
    expect(ghost?.totalCount).toBe(1);

    await Bun.write(
      `${fixture}/board.html`,
      '<span data-glossary-concept="ui.semantic.surface"></span>'
    );
    await syncConceptUsage(db, fixture);
    expect(findOrphanUsage(db).some(o => o.conceptId === 'ops.ghost.key')).toBe(false);
  });

  test('findOrphanUsage reports persisted usage rows whose key left the glossary', () => {
    expect(findOrphanUsage(db)).toEqual([]);
    recordConceptUsage(db, 'ops.gone.key', 'fixture', 'x.html', 3);
    const orphans = findOrphanUsage(db);
    const gone = orphans.find(o => o.conceptId === 'ops.gone.key');
    expect(gone).toMatchObject({ conceptId: 'ops.gone.key', totalCount: 3 });
  });

  test('unusedConceptCandidates flags never-used and stale-used concepts', () => {
    const before = unusedConceptCandidates(db, 90);
    expect(before.length).toBeGreaterThan(0);

    // A candidate with no usage rows at all (lastSeenAt null).
    const neverUsed = before.find(c => c.lastSeenAt === null);
    expect(neverUsed).toBeDefined();

    // Stale usage (older than the cutoff) keeps it a candidate.
    const staleIso = new Date(Date.now() - 100 * 86_400_000).toISOString();
    recordConceptUsage(db, neverUsed!.id, 'b', 'f.html', 1, staleIso);
    expect(unusedConceptCandidates(db, 90).some(c => c.id === neverUsed!.id)).toBe(true);

    // Fresh usage removes it from the candidate set.
    recordConceptUsage(db, neverUsed!.id, 'b', 'f.html', 1);
    expect(unusedConceptCandidates(db, 90).some(c => c.id === neverUsed!.id)).toBe(false);
  });
});

describe('concept registry graph render', () => {
  test('mermaid output is a valid flowchart with edges', () => {
    const graph = buildConceptGraph(db);
    const mermaid = renderConceptGraphMermaid(graph);
    expect(mermaid.startsWith('flowchart LR')).toBe(true);
    expect(mermaid).toContain('-->');
    expect(mermaid.split('\n').length).toBeGreaterThan(3);
    expect(mermaid).toContain('seeAlso');
  });
});
