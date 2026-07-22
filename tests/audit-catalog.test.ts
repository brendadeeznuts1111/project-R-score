/**
 * Audit finding/concept SSOT — Nagata map concept + fiber finding (not BunToken).
 */
import { describe, expect, test } from 'bun:test';
import { parseAuditConcept } from '../lib/audit/audit-concept.ts';
import {
  assertEvidencePathAllowed,
  hashFile,
  parseAuditFinding,
  verifyEvidenceHash,
} from '../lib/audit/audit-finding.ts';
import { asAuditConceptId, asAuditEntryId } from '../lib/types/branded.ts';
import {
  AUDIT_REFS,
  auditConceptDocsPath,
  auditFindingDocsPath,
  resolveAuditAlias,
} from '../lib/audit/audit-refs.ts';
import {
  renderAuditConceptMarkdown,
  renderAuditFindingMarkdown,
} from '../lib/audit/render-finding.ts';
import { joinPath } from '../lib/path-bun.ts';
import {
  buildAuditCatalog,
  getAuditConcept,
  getAuditFinding,
  loadSourceConcepts,
  loadSourceFindings,
  searchAuditCatalog,
  verifyAllEvidence,
  verifyAuditCatalog,
  verifyAuditGraph,
} from '../tools/audit-catalog.ts';

const REPO_ROOT = joinPath(import.meta.dir, '..');

describe('parseAuditFinding', () => {
  test('rejects legacy sha256-only wire', () => {
    expect(() =>
      parseAuditFinding({
        id: 'x',
        kind: 'AuditFinding',
        title: 't',
        description: 'd',
        status: 'open',
        publishedAt: '2026-07-21',
        evidence: {
          path: 'tools/audit-evidence/sample-fiber-demo.ndjson',
          sha256: 'a'.repeat(64),
          mediaType: 'text/plain',
        },
      })
    ).toThrow(/sha256 companion removed|algorithm and digest/);
  });

  test('rejects dual-write sha256 companion', () => {
    expect(() =>
      parseAuditFinding({
        id: 'y',
        kind: 'AuditFinding',
        title: 't',
        description: 'd',
        status: 'open',
        publishedAt: '2026-07-21',
        evidence: {
          path: 'tools/audit-evidence/sample-fiber-demo.ndjson',
          algorithm: 'sha3-256',
          digest: 'b'.repeat(64),
          sha256: 'c'.repeat(64),
          mediaType: 'text/plain',
        },
      })
    ).toThrow(/sha256 companion removed/);
  });

  test('algorithm+digest wire (Phase 2)', () => {
    const f = parseAuditFinding({
      id: 'y',
      kind: 'AuditFinding',
      title: 't',
      description: 'd',
      status: 'open',
      publishedAt: '2026-07-21',
      evidence: {
        path: 'tools/audit-evidence/sample-fiber-demo.ndjson',
        algorithm: 'sha3-256',
        digest: 'b'.repeat(64),
        mediaType: 'text/plain',
      },
    });
    expect(f.evidence.algorithm).toBe('sha3-256');
    expect(f.evidence.digest).toBe('b'.repeat(64));
    expect('sha256' in f.evidence).toBe(false);
  });

  test('rejects BunToken-shaped kind', () => {
    expect(() => parseAuditFinding({ kind: 'Concept' })).toThrow(/kind/);
  });

  test('rejects incomplete new shape', () => {
    expect(() =>
      parseAuditFinding({
        id: 'z',
        kind: 'AuditFinding',
        title: 't',
        description: 'd',
        status: 'open',
        publishedAt: '2026-07-21',
        evidence: {
          path: 'tools/audit-evidence/x.jsonl',
          algorithm: 'sha3-256',
          mediaType: 'text/plain',
        },
      })
    ).toThrow(/algorithm and digest/);
  });

  test('evidence path allowlist', () => {
    expect(assertEvidencePathAllowed('tools/audit-evidence/ok.jsonl').ok).toBe(true);
    expect(assertEvidencePathAllowed('../etc/passwd').ok).toBe(false);
  });
});

describe('parseAuditConcept + Nagata map', () => {
  test('parses nagata-map concept', () => {
    const c = parseAuditConcept({
      id: 'nagata-map',
      kind: 'AuditConcept',
      title: 'Nagata map',
      description: 'constant Jac, not injective',
      publishedAt: '2026-07-21',
      related: ['sample-fiber-demo-2026-07-21'],
    });
    expect(c.kind).toBe('AuditConcept');
    expect(c.id).toBe('nagata-map');
  });

  test('aliases prefer concept nagata-map', () => {
    expect(resolveAuditAlias('Nagata map')).toBe('nagata-map');
    expect(resolveAuditAlias('nagata map')).toBe('nagata-map');
    expect(AUDIT_REFS['Nagata map']).toBe('nagata-map');
    expect(auditConceptDocsPath('nagata-map')).toBe('docs/audit/concepts/nagata-map.md');
    expect(auditFindingDocsPath('sample-fiber-demo-2026-07-21')).toContain('findings/');
  });

  test('concept markdown cites Jacobian conjecture context', () => {
    const c = parseAuditConcept({
      id: 'nagata-map',
      kind: 'AuditConcept',
      title: 'Nagata map',
      description: 'A polynomial map with constant non-zero Jacobian that is not injective.',
      publishedAt: '2026-07-21',
      references: ['Masayoshi Nagata (1972)'],
      related: ['sample-fiber-demo-2026-07-21'],
    });
    const md = renderAuditConceptMarkdown(c);
    expect(md).toContain('AuditConcept');
    expect(md).toContain('Masayoshi Nagata');
    expect(md).toContain('not BunToken');
  });
});

describe('audit catalog', () => {
  test('findings + concepts load; evidence verifies', async () => {
    const findings = await loadSourceFindings();
    const concepts = await loadSourceConcepts();
    expect(findings.length).toBeGreaterThan(0);
    expect(concepts.some(c => c.id === 'nagata-map')).toBe(true);
    expect(getAuditConcept(concepts, 'Nagata map')?.id).toBe('nagata-map');
    expect(await verifyAllEvidence(findings, REPO_ROOT)).toEqual([]);
    const sample = getAuditFinding(findings, 'sample-fiber-demo-2026-07-21');
    expect(sample?.related).toContain('nagata-map');
    expect(sample?.evidence.algorithm).toBe('sha3-256');
    expect(sample?.related).toContain('sha3-integrity');
    const abs = joinPath(REPO_ROOT, sample!.evidence.path);
    expect(await hashFile(abs, 'sha3-256')).toBe(sample!.evidence.digest);
    expect(await verifyEvidenceHash(sample!, REPO_ROOT)).toEqual({ ok: true });
  });

  test('build writes concept + finding pages; search prefers Nagata concept', async () => {
    const catalog = await buildAuditCatalog();
    expect(catalog.conceptCount).toBeGreaterThanOrEqual(2);
    expect(catalog.findings[0]!.docsPath).toContain('findings/');
    const conceptPage = Bun.file(joinPath(REPO_ROOT, 'docs/audit/concepts/nagata-map.md'));
    expect(await conceptPage.exists()).toBe(true);
    expect(await conceptPage.text()).toContain('Jacobian');
    const findingMd = renderAuditFindingMarkdown(
      catalog.findings.find(f => f.id === 'sample-fiber-demo-2026-07-21')!
    );
    expect(findingMd).toContain('nagata-map');
    expect(findingMd).toContain('discoveredIn');
    expect(findingMd).toContain('sha3-256');
    expect(findingMd).toContain('digest');
    const hits = searchAuditCatalog(catalog, 'Nagata map');
    expect(hits[0]?.kind).toBe('AuditConcept');
    expect(hits[0]?.id).toBe('nagata-map');
    expect((await verifyAuditCatalog()).ok).toBe(true);
  });

  test('related graph: ids unique; related resolves; sha3-256 digest matches', async () => {
    const findings = await loadSourceFindings();
    const concepts = await loadSourceConcepts();
    expect(verifyAuditGraph(findings, concepts)).toEqual([]);
    const sample = getAuditFinding(findings, 'sample-fiber-demo-2026-07-21')!;
    expect(sample.discoveredIn).toBe('1.4.0');
    expect(sample.evidence.algorithm).toBe('sha3-256');
    expect(sample.related).toEqual(
      expect.arrayContaining(['nagata-map', 'jacobian-nullspace', 'sha3-integrity'])
    );
    const broken = verifyAuditGraph(findings, [
      ...concepts,
      {
        id: asAuditConceptId('orphan-concept'),
        kind: 'AuditConcept',
        title: 'x',
        description: 'y',
        publishedAt: '2026-07-21',
        related: [asAuditEntryId('does-not-exist')],
      },
    ]);
    expect(broken.some(e => e.includes('does-not-exist'))).toBe(true);
  });
});

describe('suggest Nagata map (not BunToken)', () => {
  test('suggest "Nagata map" returns AuditConcept', async () => {
    const proc = Bun.spawn(['bun', 'tools/bun-doc-refs.ts', 'suggest', 'Nagata map'], {
      cwd: REPO_ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const out = await new Response(proc.stdout).text();
    const code = await proc.exited;
    expect(code).toBe(0);
    expect(out).toContain('kind: AuditConcept');
    expect(out).toContain('nagata-map');
    expect(out).toContain('docs: docs/audit/concepts/nagata-map.md');
    expect(out).toContain('not BunToken');
    expect(out).not.toContain('canonical map — tools/bun-doc-refs.ts CANONICAL_REFS');
  });


  test('suggest "harness day-loop" returns AuditConcept (not Bun upstream)', async () => {
    const proc = Bun.spawn(['bun', 'tools/bun-doc-refs.ts', 'suggest', 'harness day-loop'], {
      cwd: REPO_ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const out = await new Response(proc.stdout).text();
    expect(await proc.exited).toBe(0);
    expect(out).toContain('kind: AuditConcept');
    expect(out).toContain('harness-day-loop');
    expect(out).toContain('docs/harness/day-loop.md');
    expect(out).toContain('not BunToken');
  });

  test('suggest --audit fiber still returns finding', async () => {
    const proc = Bun.spawn(
      ['bun', 'tools/bun-doc-refs.ts', 'suggest', '--audit', 'fiber'],
      { cwd: REPO_ROOT, stdout: 'pipe', stderr: 'pipe' }
    );
    const out = await new Response(proc.stdout).text();
    expect(await proc.exited).toBe(0);
    expect(out).toContain('kind: AuditFinding');
    expect(out).toContain('sample-fiber-demo-2026-07-21');
  });

  test('suggest --audit --json fiber is machine-readable', async () => {
    const proc = Bun.spawn(
      ['bun', 'tools/bun-doc-refs.ts', 'suggest', '--audit', '--json', 'fiber'],
      { cwd: REPO_ROOT, stdout: 'pipe', stderr: 'pipe' }
    );
    const out = await new Response(proc.stdout).text();
    expect(await proc.exited).toBe(0);
    const parsed = JSON.parse(out) as {
      ok: boolean;
      bunToken: boolean;
      hits: Array<{ id: string; kind: string }>; // brand-ok — JSON wire shape from suggest --json
    };
    expect(parsed.ok).toBe(true);
    expect(parsed.bunToken).toBe(false);
    expect(parsed.hits.some(h => h.id === 'sample-fiber-demo-2026-07-21')).toBe(true);
  });
});
