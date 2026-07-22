#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto — SHA3-256
/**
 * Stub emitter: write schema-valid AuditFinding + evidence for ingest proof.
 * Real rotor (when it exists) must emit the same JSON shape.
 *
 * Phase 1: primary sha3-256 digest + sha256 companion (dual-write). No --sha3 flag.
 *
 *   bun tools/audit-emit-stub.ts
 */
import type { AuditFinding } from '../lib/audit/audit-finding.ts';
import { hashFile } from '../lib/audit/audit-finding.ts';
import { joinPath } from '../lib/path-bun.ts';
import { asAuditEntryId, asAuditFindingId } from '../lib/types/branded.ts';

const REPO_ROOT = joinPath(import.meta.dir, '..');
const EVIDENCE_REL = 'tools/audit-evidence/sample-fiber-demo.ndjson';
const FINDING_PATH = joinPath(REPO_ROOT, 'tools/audit-findings/sample-fiber-demo.json');
const EVIDENCE_PATH = joinPath(REPO_ROOT, EVIDENCE_REL);

const EVIDENCE_BODY = `{"event":"meta","note":"FactoryWager audit-catalog sample — synthetic Nagata-type fiber demo, not a production sportsbook claim"}
{"event":"definition","map":"Nagata","space":"R^3","formula":"F(x,y,z)=(x, y-2x(zx+y^2)-(zx+y^2)^2, z+2y(zx+y^2)+x(zx+y^2)^2)","jacobianDet":1,"injective":false,"citation":"Masayoshi Nagata (1972)"}
{"event":"profiles","a":[10,5,2],"b":[8,7,2],"note":"Distinct profile triples used as a pedagogical stand-in for fiber endpoints"}
{"event":"collision","scoreA":42,"scoreB":42,"jacobianNorm":2,"jacobianNullspaceDim":0,"interpretation":"Local DF full rank (nullspace trivial) yet scores collide — Nagata-type global fiber"}
{"event":"proof","kind":"synthetic-fiber-curve","relatedConcepts":["nagata-map","jacobian-nullspace"]}
`;

async function main(): Promise<void> {
  await Bun.write(EVIDENCE_PATH, EVIDENCE_BODY);
  const digest = await hashFile(EVIDENCE_PATH, 'sha3-256');
  const sha256 = await hashFile(EVIDENCE_PATH, 'sha256');
  const finding: AuditFinding = {
    id: asAuditFindingId('sample-fiber-demo-2026-07-21'),
    kind: 'AuditFinding',
    title: 'Synthetic Nagata-type fiber in demo risk scores',
    description:
      'Two distinct profile triples (10,5,2) and (8,7,2) yield the same demo risk score while the local Jacobian nullspace is trivial (constant non-zero Jac). Pedagogical stand-in for a Nagata map fiber — not a production sportsbook claim. See concept nagata-map.',
    status: 'confirmed',
    publishedAt: '2026-07-21',
    since: '2026-07-21',
    discoveredIn: '1.4.0',
    evidence: {
      path: EVIDENCE_REL,
      algorithm: 'sha3-256',
      digest,
      sha256,
      mediaType: 'application/x-ndjson',
    },
    related: [asAuditEntryId('nagata-map'), asAuditEntryId('jacobian-nullspace')],
    relatedDocs: [],
    meta: {
      buildPin: Bun.version.split('+')[0] ?? Bun.version,
      emitter: 'audit-emit-stub',
    },
  };
  await Bun.write(FINDING_PATH, `${JSON.stringify(finding, null, 2)}\n`);
  console.info(`✅ wrote ${EVIDENCE_REL}`);
  console.info(`✅ wrote tools/audit-findings/sample-fiber-demo.json`);
  console.info(`   algorithm=sha3-256 digest=${digest}`);
  console.info(`   sha256 companion=${sha256}`);
  const { buildAuditCatalog } = await import('./audit-catalog.ts');
  const catalog = await buildAuditCatalog();
  console.info(
    `✅ rebuilt audit catalog (${catalog.count} findings, ${catalog.conceptCount} concepts + docs pages)`
  );
}

if (import.meta.main) {
  await main();
}
