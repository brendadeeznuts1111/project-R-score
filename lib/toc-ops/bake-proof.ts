// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * TOC Ops bake proof — compact evidence that operate-lite + R_P bake landed.
 * Written beside toc-ops.json for Pages agents / verify gates.
 *
 * @see docs/harness/tenants/toc-ops.md
 * @see lib/registry/contracts.ts validateTocOpsBakeProof
 */
import type { TocOpsSnapshot } from './types.ts';
import { TOC_OPS_REGISTRY_PATH } from './export-snapshot.ts';

export const TOC_OPS_BAKE_PROOF_REL = 'public/registry/toc-ops-bake-proof.json';
export const TOC_OPS_BAKE_PROOF_PATH = '/registry/toc-ops-bake-proof.json' as const;

export type TocOpsBakeProof = {
  schema: 'factorywager.toc-ops.bake-proof.v1';
  ok: boolean;
  generatedAt: string;
  fixturePath: typeof TOC_OPS_REGISTRY_PATH;
  proofPath: typeof TOC_OPS_BAKE_PROOF_PATH;
  plane: 'demo-readonly';
  enforcementPlane: 'operate-lite' | null;
  partners: number;
  warmed: number;
  gatesPassed: number;
  gatesFailed: number;
  gatesCritical: number;
  focus: 'rope' | 'drum' | 'buffer' | 'elevate' | null;
  throughput: { T: number; I: number; OE: number } | null;
  avgRP: number | null;
  topRankedProcess: string | null;
  identityLinked: boolean;
  checks: Array<{ id: string; ok: boolean; detail?: string }>; // brand-ok — check slug, not domain PK
};

export function buildTocOpsBakeProof(snap: TocOpsSnapshot): TocOpsBakeProof {
  const enf = snap.enforcement;
  const checks: TocOpsBakeProof['checks'] = [
    {
      id: 'schema-v2',
      ok: snap.schema === 'factorywager.toc-ops.portal-fixture.v2',
      detail: snap.schema,
    },
    { id: 'plane-demo-readonly', ok: snap.plane === 'demo-readonly' },
    { id: 'read-only', ok: snap.readOnly === true },
    {
      id: 'enforcement-operate-lite',
      ok: enf?.plane === 'operate-lite',
      detail: enf?.plane ?? 'missing',
    },
    {
      id: 'partners-ash-pat-nov',
      ok:
        snap.partners.length === 3 &&
        snap.partners.map(p => p.partnerCode).join(',') === 'ASH,PAT,NOV',
    },
    {
      id: 'throughput-present',
      ok: enf != null && typeof enf.throughput.T === 'number',
    },
    {
      id: 'return-efficiency-present',
      ok: snap.returnEfficiency != null && typeof snap.returnEfficiency.avgRP === 'number',
      detail: snap.returnEfficiency ? `avgRP=${snap.returnEfficiency.avgRP}` : 'missing',
    },
  ];
  const ok = checks.every(c => c.ok);
  return {
    schema: 'factorywager.toc-ops.bake-proof.v1',
    ok,
    generatedAt: new Date().toISOString(),
    fixturePath: TOC_OPS_REGISTRY_PATH,
    proofPath: TOC_OPS_BAKE_PROOF_PATH,
    plane: 'demo-readonly',
    enforcementPlane: enf?.plane ?? null,
    partners: snap.summary.partners,
    warmed: snap.summary.warmed,
    gatesPassed: enf?.passed ?? 0,
    gatesFailed: enf?.failed ?? 0,
    gatesCritical: enf?.criticalFailed ?? 0,
    focus: enf?.diagnosis.focus ?? null,
    throughput: enf ? { T: enf.throughput.T, I: enf.throughput.I, OE: enf.throughput.OE } : null,
    avgRP: snap.returnEfficiency?.avgRP ?? null,
    topRankedProcess: snap.rankedActions?.[0]?.process ?? null,
    identityLinked: snap.identity?.linked ?? false,
    checks,
  };
}

export async function writeTocOpsBakeProof(
  snap: TocOpsSnapshot,
  root = process.cwd()
): Promise<{ path: string; ok: boolean }> {
  const proof = buildTocOpsBakeProof(snap);
  const abs = root.endsWith('/')
    ? `${root}${TOC_OPS_BAKE_PROOF_REL}`
    : `${root}/${TOC_OPS_BAKE_PROOF_REL}`;
  await Bun.write(abs, `${JSON.stringify(proof, null, 2)}\n`);
  return { path: abs, ok: proof.ok };
}
