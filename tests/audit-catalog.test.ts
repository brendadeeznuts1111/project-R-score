/**
 * Audit finding/concept SSOT — Nagata map concept + fiber finding (not BunToken).
 */
import { describe, expect, test } from 'bun:test';
// Couple test:changed graph to suggest --audit CLI (spawn-only tests would miss it).
import '../tools/bun-doc-refs.ts';
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
  parseAuditCatalogRaw,
  searchAuditCatalog,
  verifyAllEvidence,
  verifyAuditCatalog,
  verifyAuditGraph,
  verifyCatalogParity,
  verifyOrphanPages,
  verifyPageContent,
  verifyRelatedDocs,
  writeAuditPages,
} from '../tools/audit-catalog.ts';
import { EVIDENCE_BODY } from '../tools/audit-emit-stub.ts';
import { migrateOneFinding } from '../tools/audit-migrate-to-sha3.ts';

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
    ).toThrow(/legacy \{sha256\}-only wire rejected/);
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

  test('inbound sha256 algorithm still parses and verifyEvidenceHash accepts', async () => {
    const path = 'tools/audit-evidence/sample-fiber-demo.ndjson';
    const digest = await hashFile(joinPath(REPO_ROOT, path), 'sha256');
    const f = parseAuditFinding({
      id: 'inbound-sha256',
      kind: 'AuditFinding',
      title: 't',
      description: 'd',
      status: 'open',
      publishedAt: '2026-07-21',
      evidence: {
        path,
        algorithm: 'sha256',
        digest,
        mediaType: 'application/x-ndjson',
      },
    });
    expect(f.evidence.algorithm).toBe('sha256');
    expect(await verifyEvidenceHash(f, REPO_ROOT)).toEqual({ ok: true });
    expect(await verifyEvidenceHash({ ...f, evidence: { ...f.evidence, digest: '0'.repeat(64) } }, REPO_ROOT)).toEqual(
      expect.objectContaining({ ok: false })
    );
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

  test('rejects empty relatedDocs items', () => {
    expect(() =>
      parseAuditFinding({
        id: 'z',
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
        relatedDocs: [''],
      })
    ).toThrow(/relatedDocs\[0\]/);
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
    // Stub body must match committed evidence (prevents emit-stub drift)
    const onDisk = await Bun.file(abs).text();
    expect(onDisk).toBe(EVIDENCE_BODY);
    expect(onDisk).toContain('"sha3-integrity"');
    expect(await hashFile(abs, 'sha3-256')).toBe(
      new Bun.CryptoHasher('sha3-256').update(EVIDENCE_BODY).digest('hex')
    );
  });

  test('SSOT verifyAllEvidence refuses algorithm sha256', async () => {
    const findings = await loadSourceFindings();
    const sample = getAuditFinding(findings, 'sample-fiber-demo-2026-07-21')!;
    const digest = await hashFile(joinPath(REPO_ROOT, sample.evidence.path), 'sha256');
    const inbound = {
      ...sample,
      evidence: { ...sample.evidence, algorithm: 'sha256' as const, digest },
    };
    expect(await verifyEvidenceHash(inbound, REPO_ROOT)).toEqual({ ok: true });
    expect(
      (await verifyAllEvidence([inbound], REPO_ROOT)).some(e =>
        e.includes('SSOT evidence.algorithm must be sha3-256')
      )
    ).toBe(true);
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
    expect(getAuditConcept(concepts, 'nagata-map')?.related).toEqual(
      expect.arrayContaining(['sha3-integrity'])
    );
    expect(getAuditConcept(concepts, 'sha3-integrity')?.related).toEqual(
      expect.arrayContaining(['nagata-map'])
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
    expect(broken.some(e => e.includes('missing AUDIT_REFS identity'))).toBe(true);
  });

  test('relatedDocs must resolve; identity AUDIT_REFS required', async () => {
    const findings = await loadSourceFindings();
    const concepts = await loadSourceConcepts();
    expect(verifyRelatedDocs(findings, concepts, () => true)).toEqual([]);
    expect(
      verifyRelatedDocs(findings, concepts, token => token !== 'SHA3-256').some(e =>
        e.includes('SHA3-256')
      )
    ).toBe(true);
    expect((await verifyAuditCatalog()).ok).toBe(true);
  });

  test('relatedDocs resolve via live curated (no bun-doc-refs import)', async () => {
    const { getCuratedEntry } = await import('../tools/bun-docs-curated.ts');
    const findings = await loadSourceFindings();
    const concepts = await loadSourceConcepts();
    expect(getCuratedEntry('SHA3-256')).not.toBeNull();
    expect(verifyRelatedDocs(findings, concepts, t => Boolean(getCuratedEntry(t)))).toEqual([]);
  });

  test('parseAuditCatalogRaw rejects non-array findings/concepts (no soft-coerce)', () => {
    expect(() => parseAuditCatalogRaw({ findings: 'oops', concepts: [] })).toThrow(
      /must be arrays/
    );
    expect(() => parseAuditCatalogRaw({ findings: [], concepts: null })).toThrow(/must be arrays/);
    expect(() => parseAuditCatalogRaw(null)).toThrow(/invalid shape/);
  });

  test('parseAuditCatalogRaw rejects lied count/byStatus meta', async () => {
    const catalog = await buildAuditCatalog();
    expect(() =>
      parseAuditCatalogRaw({
        ...catalog,
        count: catalog.count + 99,
      })
    ).toThrow(/count .+ ≠ findings\.length/);
    expect(() =>
      parseAuditCatalogRaw({
        ...catalog,
        byStatus: { confirmed: 0, mitigated: 0, open: 99 },
      })
    ).toThrow(/byStatus mismatch/);
  });

  test('verifyCatalogParity flags missing/stale ids and entry drift', async () => {
    const catalog = await buildAuditCatalog();
    const findings = await loadSourceFindings();
    const concepts = await loadSourceConcepts();
    expect(verifyCatalogParity({ findings, concepts }, catalog)).toEqual([]);
    const stale = {
      ...catalog,
      findings: catalog.findings.slice(1),
      count: Math.max(0, catalog.count - 1),
    };
    expect(
      verifyCatalogParity({ findings, concepts }, stale).some(e => e.includes('missing finding'))
    ).toBe(true);
    if (catalog.findings[0]) {
      const drifted = {
        ...catalog,
        findings: [
          {
            ...catalog.findings[0],
            title: `${catalog.findings[0].title} DRIFT`,
          },
          ...catalog.findings.slice(1),
        ],
      };
      expect(
        verifyCatalogParity({ findings, concepts }, drifted).some(e => e.includes('catalog entry drift'))
      ).toBe(true);
    }
  });

  test('build skip-republish returns disk generated timestamp', async () => {
    const first = await buildAuditCatalog();
    const second = await buildAuditCatalog();
    expect(second.generated).toBe(first.generated);
    expect(second.bunVersion).toBe(first.bunVersion);
  });

  test('build prunes orphan pages; page content matches render', async () => {
    const findings = await loadSourceFindings();
    const concepts = await loadSourceConcepts();
    const orphan = joinPath(REPO_ROOT, 'docs/audit/concepts/orphan-tmp-verify.md');
    await Bun.write(orphan, '# orphan\n');
    expect((await verifyOrphanPages(findings, concepts)).some(e => e.includes('orphan-tmp-verify'))).toBe(
      true
    );
    await writeAuditPages(findings, concepts);
    expect(await Bun.file(orphan).exists()).toBe(false);
    expect(await verifyOrphanPages(findings, concepts)).toEqual([]);
    expect(await verifyPageContent(findings, concepts)).toEqual([]);
  });

  test('writeAuditPages skips unchanged bytes (no mtime churn)', async () => {
    const findings = await loadSourceFindings();
    const concepts = await loadSourceConcepts();
    await writeAuditPages(findings, concepts);
    const page = joinPath(REPO_ROOT, 'docs/audit/concepts/nagata-map.md');
    const before = (await Bun.file(page).stat()).mtimeMs;
    await Bun.sleep(30);
    await writeAuditPages(findings, concepts);
    const after = (await Bun.file(page).stat()).mtimeMs;
    expect(after).toBe(before);
  });
});

describe('audit-migrate-to-sha3', () => {
  test('strips companion and skips already Phase 2', async () => {
    const tmp = joinPath(REPO_ROOT, `.tmp-audit-migrate-${Date.now()}`);
    await Bun.$`mkdir -p ${tmp}`;
    try {
      const evidenceRel = 'tools/audit-evidence/sample-fiber-demo.ndjson';
      const digest = await hashFile(joinPath(REPO_ROOT, evidenceRel), 'sha3-256');
      const companionPath = joinPath(tmp, 'with-companion.json');
      await Bun.write(
        companionPath,
        `${JSON.stringify({
          id: 'tmp-companion',
          kind: 'AuditFinding',
          title: 't',
          description: 'd',
          status: 'open',
          publishedAt: '2026-07-21',
          evidence: {
            path: evidenceRel,
            algorithm: 'sha3-256',
            digest,
            sha256: 'a'.repeat(64),
            mediaType: 'application/x-ndjson',
          },
        })}\n`
      );
      expect(await migrateOneFinding(tmp, REPO_ROOT, 'with-companion.json')).toBe('migrated');
      const after = (await Bun.file(companionPath).json()) as {
        evidence: { algorithm: string; digest: string; sha256?: string };
      };
      expect(after.evidence.algorithm).toBe('sha3-256');
      expect(after.evidence.digest).toBe(digest);
      expect(after.evidence.sha256).toBeUndefined();

      expect(await migrateOneFinding(tmp, REPO_ROOT, 'with-companion.json')).toBe('skipped');

      const sha256AlgoPath = joinPath(tmp, 'algo-sha256.json');
      await Bun.write(
        sha256AlgoPath,
        `${JSON.stringify({
          id: 'tmp-sha256-algo',
          kind: 'AuditFinding',
          title: 't',
          description: 'd',
          status: 'open',
          publishedAt: '2026-07-21',
          evidence: {
            path: evidenceRel,
            algorithm: 'sha256',
            digest: 'b'.repeat(64),
            mediaType: 'application/x-ndjson',
          },
        })}\n`
      );
      expect(await migrateOneFinding(tmp, REPO_ROOT, 'algo-sha256.json')).toBe('migrated');
      const afterAlgo = (await Bun.file(sha256AlgoPath).json()) as {
        evidence: { algorithm: string; digest: string };
      };
      expect(afterAlgo.evidence.algorithm).toBe('sha3-256');
      expect(afterAlgo.evidence.digest).toBe(digest);
    } finally {
      await Bun.$`rm -rf ${tmp}`;
    }
  });
});

describe('suggest Nagata map (not BunToken)', () => {
  test('suggest Bun.CryptoHasher surfaces sha3-integrity auditRefs', async () => {
    const proc = Bun.spawn(['bun', 'tools/bun-doc-refs.ts', 'suggest', 'Bun.CryptoHasher'], {
      cwd: REPO_ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const out = await new Response(proc.stdout).text();
    expect(await proc.exited).toBe(0);
    expect(out).toContain('auditRefs: sha3-integrity');
    expect(out).toContain('suggest --audit "sha3-integrity"');
  });

  test('suggest --audit "SHA3-256" prefers sha3-integrity (not jacobian)', async () => {
    expect(resolveAuditAlias('SHA3-256')).toBe('sha3-integrity');
    expect(resolveAuditAlias('sha3-256')).toBe('sha3-integrity');
    const catalog = await buildAuditCatalog();
    const hits = searchAuditCatalog(catalog, 'SHA3-256');
    expect(hits[0]?.id).toBe('sha3-integrity');
    expect(hits[0]?.kind).toBe('AuditConcept');
    // Finding that relates to the concept also co-hits
    expect(hits.some(h => h.id === 'sample-fiber-demo-2026-07-21')).toBe(true);
    expect(hits.some(h => h.id === 'jacobian-nullspace')).toBe(false);
    const proc = Bun.spawn(
      ['bun', 'tools/bun-doc-refs.ts', 'suggest', '--audit', 'SHA3-256'],
      { cwd: REPO_ROOT, stdout: 'pipe', stderr: 'pipe' }
    );
    const out = await new Response(proc.stdout).text();
    expect(await proc.exited).toBe(0);
    expect(out).toMatch(/alias: "SHA3-256" → sha3-integrity/);
    expect(out).toContain('id: sha3-integrity');
    expect(out).toContain('also try: bun tools/bun-doc-refs.ts suggest "SHA3-256"');
  });

  test('suggest --isolate surfaces harness-day-loop auditRefs', async () => {
    const proc = Bun.spawn(['bun', 'tools/bun-doc-refs.ts', 'suggest', '--isolate'], {
      cwd: REPO_ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const out = await new Response(proc.stdout).text();
    expect(await proc.exited).toBe(0);
    expect(out).toContain('auditRefs: harness-day-loop');
  });

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

  test('suggest --audit --json reports load failure without stack dump', async () => {
    const catalogPath = joinPath(REPO_ROOT, 'tools/audit-catalog.json');
    const backup = await Bun.file(catalogPath).text();
    try {
      await Bun.write(catalogPath, '{"findings":"oops","concepts":[]}\n');
      const proc = Bun.spawn(
        ['bun', 'tools/bun-doc-refs.ts', 'suggest', '--audit', '--json', 'fiber'],
        { cwd: REPO_ROOT, stdout: 'pipe', stderr: 'pipe' }
      );
      const out = await new Response(proc.stdout).text();
      const err = await new Response(proc.stderr).text();
      expect(await proc.exited).not.toBe(0);
      const parsed = JSON.parse(out) as { ok: boolean; repair?: string; error?: string };
      expect(parsed.ok).toBe(false);
      expect(parsed.repair).toBe('bun run audit:catalog:build');
      expect(parsed.error).toMatch(/must be arrays/);
      expect(err).not.toMatch(/at suggestAudit/);
    } finally {
      await Bun.write(catalogPath, backup);
    }
  });
});

describe('isAuditSsotPath', () => {
  test('covers catalog tools, tests, and branded audit module', async () => {
    const { isAuditSsotPath } = await import('../scripts/pre-commit-harness.ts');
    expect(isAuditSsotPath('tools/audit-findings/x.json')).toBe(true);
    expect(isAuditSsotPath('tests/audit-catalog.test.ts')).toBe(true);
    expect(isAuditSsotPath('lib/types/branded/audit.ts')).toBe(true);
    expect(isAuditSsotPath('tools/bun-doc-refs.ts')).toBe(true);
    expect(isAuditSsotPath('tests/console-depth.test.ts')).toBe(false);
  });
});
