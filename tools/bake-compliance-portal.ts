#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
/**
 * Bake compliance + enhancement artifacts for portal / Pages.
 *
 * Writes:
 *   public/registry/compliance-enhancements.json
 *   public/registry/compliance-shadow.json
 *   public/registry/compliance-board.json  (combined board for portal)
 * Bakes JSON embed into public/portal/compliance/index.html
 *
 *   bun run compliance:bake
 *   bun run proton:run -- factorywager -- bun run compliance:bake
 *
 * No secrets required for bake (in-process mock). Optional:
 *   COMPLIANCE_URL — hit live mock instead of embed for shadow matrix
 */
import { joinPath } from '../lib/path-bun.ts';
import { bakeJsonEmbed } from '../lib/http/portal-embed-bake.ts';
import { buildReportProofFromValue, type ReportProof } from '../lib/security/report-proof.ts';
import { buildEnhancementReport, type EnhancementReport } from './show-enhancements.ts';

const ROOT = joinPath(import.meta.dir, '..');
const REG = joinPath(ROOT, 'public/registry');
const PORTAL_HTML = joinPath(ROOT, 'public/portal/compliance/index.html');

type ShadowRow = {
  state: string;
  partner: string;
  licenseStatus: string | null;
  realAllowed: boolean;
  shadowAllowed: boolean;
  match: boolean;
  reason?: string;
};

async function buildShadowMatrix(): Promise<{
  generatedAt: string;
  base: string;
  rows: ShadowRow[];
  summary: { allow: number; block: number; mismatches: number };
  signature: string;
  proof: ReportProof;
}> {
  // Prefer live URL when set (Proton inject / CI); else embed mock via enhanced report logic.
  const envUrl = Bun.env.COMPLIANCE_URL?.trim();
  let base = envUrl ?? '';
  let stop: (() => void) | undefined;

  if (!base) {
    const { startStateComplianceMock } = await import('../lib/operations/state-compliance-http.ts');
    const started = startStateComplianceMock({ port: 0, log: false });
    base = started.url;
    stop = () => started.server.stop(true);
  }

  try {
    const partners = [
      'demo-ma-licensed',
      'demo-nj-licensed',
      'demo-dual-licensed',
      'demo-unlicensed',
    ] as const;
    const states = ['MA', 'NJ'] as const;
    const rows: ShadowRow[] = [];

    for (const partner of partners) {
      for (const state of states) {
        const statusRes = await fetch(
          `${base.replace(/\/$/, '')}/api/compliance/status?nodeId=${encodeURIComponent(partner)}&state=${state}`
        );
        const status = (await statusRes.json()) as {
          regulatory?: { license?: { status?: string } | null };
        };
        const licenseStatus = status.regulatory?.license?.status ?? null;

        const realRes = await fetch(`${base.replace(/\/$/, '')}/api/compliance/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeId: partner,
            stateCode: state,
            sportId: 'soccer',
            marketId: 'match_winner',
            wagerAmount: 100,
            betType: 'straight',
            logViolation: false,
          }),
        });
        const real = (await realRes.json()) as { allowed?: boolean; reason?: string };

        const shadowRes = await fetch(
          `${base.replace(/\/$/, '')}/api/compliance/check?shadow=true`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nodeId: partner,
              stateCode: state,
              sportId: 'soccer',
              marketId: 'match_winner',
              wagerAmount: 100,
              betType: 'straight',
              logViolation: false,
            }),
          }
        );
        const shadow = (await shadowRes.json()) as { allowed?: boolean; reason?: string };

        const realAllowed = real.allowed === true;
        const shadowAllowed = shadow.allowed === true;
        rows.push({
          state,
          partner,
          licenseStatus,
          realAllowed,
          shadowAllowed,
          match: realAllowed === shadowAllowed,
          reason: real.reason ?? shadow.reason,
        });
      }
    }

    const allow = rows.filter(r => r.realAllowed).length;
    const block = rows.length - allow;
    const mismatches = rows.filter(r => !r.match).length;
    const generatedAt = new Date().toISOString();
    const stable = { base, rows, summary: { allow, block, mismatches }, bunVersion: Bun.version };
    const proof = buildReportProofFromValue(stable);
    return {
      generatedAt,
      base,
      rows,
      summary: { allow, block, mismatches },
      signature: proof.digest,
      proof,
    };
  } finally {
    stop?.();
  }
}

export type ComplianceBoard = {
  schemaVersion: 1;
  generatedAt: string;
  enhancements: EnhancementReport;
  shadow: Awaited<ReturnType<typeof buildShadowMatrix>>;
  geo?: {
    partners: Array<{
      nodeId: string; // brand-ok
      stateCode: string;
      age: number | null;
      location: string | null;
      zipCode: string | null;
    }>;
  };
  integrity?: {
    scoreHint: string;
    proof: ReportProof;
    checks: Array<{ id: string; ok: boolean; label: string }>; // brand-ok — checklist key
  };
  links: {
    portal: string;
    registryEnhancements: string;
    registryShadow: string;
    api: string;
    deepAudit: string;
  };
  proton: {
    note: string;
    inject: string;
    bakeVault: string;
    reportSigning: string;
    vaultMap: string;
  };
};

export type BakeCompliancePortalResult = {
  ok: boolean;
  boardPath: string;
  generatedAt: string;
  enhancements: { passed: number; total: number };
  shadowMismatches: number;
  hmac: boolean;
  board: ComplianceBoard;
};

/**
 * Bake compliance registry + portal embed (offline-safe).
 * Used by `bun run compliance:bake` and as an ops:snapshot companion.
 */
export async function bakeCompliancePortal(opts?: {
  /** When false, skip console chatter (ops-snapshot uses a one-liner). Default true. */
  log?: boolean;
}): Promise<BakeCompliancePortalResult> {
  const log = opts?.log !== false;
  if (log) console.info('compliance:bake · building enhancement + shadow artifacts…');

  const enhancements = await buildEnhancementReport();
  const shadow = await buildShadowMatrix();
  const generatedAt = new Date().toISOString();

  // Geo demo slice (same mock seed as state-compliance-http)
  const { createMockComplianceDb } = await import('../lib/operations/state-compliance-http.ts');
  const { getPartnerGeoProfile } = await import('../lib/operations/state-regulation.ts');
  const geoDb = createMockComplianceDb();
  const geoPartners = [
    'demo-ma-licensed',
    'demo-nj-licensed',
    'demo-dual-licensed',
    'demo-unlicensed',
  ].map(nodeId => {
    const g = getPartnerGeoProfile(geoDb, nodeId);
    return {
      nodeId,
      stateCode: g?.stateCode ?? '—',
      age: g?.age ?? null,
      location: g?.location ?? null,
      zipCode: g?.zipCode ?? null,
    };
  });
  geoDb.close();

  const boardProof = buildReportProofFromValue({
    kind: 'compliance-board',
    enhancements: {
      passed: enhancements.passed,
      total: enhancements.total,
      signature: enhancements.signature,
    },
    shadow: {
      summary: shadow.summary,
      digest: shadow.proof?.digest ?? shadow.signature,
    },
    geoPartners,
    bunVersion: Bun.version,
  });

  const integrityChecks = [
    {
      id: 'enhancements',
      ok: enhancements.passed === enhancements.total,
      label: `Enhancements ${enhancements.passed}/${enhancements.total}`,
    },
    {
      id: 'shadow',
      ok: shadow.summary.mismatches === 0,
      label: `Shadow mismatches ${shadow.summary.mismatches}`,
    },
    {
      id: 'sha3',
      ok: boardProof.algorithm === 'sha3-256',
      label: 'Board integrity sha3-256',
    },
    {
      id: 'hmac',
      ok: Boolean(boardProof.hmac),
      label: 'HMAC (REPORT_SIGNING_SECRET from vault/mint)',
    },
    {
      id: 'geo',
      ok: geoPartners.every(p => p.zipCode && p.location && p.stateCode !== '—'),
      label: 'Geo profiles discrete (state/age/location/zip)',
    },
  ];

  const board: ComplianceBoard = {
    schemaVersion: 1,
    generatedAt,
    enhancements,
    shadow,
    geo: { partners: geoPartners },
    integrity: {
      scoreHint: boardProof.hmac
        ? 'integrity+hmac'
        : 'integrity-only (mint REPORT_SIGNING_SECRET or vault inject)',
      proof: boardProof,
      checks: integrityChecks,
    },
    links: {
      portal: '/portal/compliance/',
      registryEnhancements: '/registry/compliance-enhancements.json',
      registryShadow: '/registry/compliance-shadow.json',
      api: '/api/compliance',
      deepAudit: 'bun run ops:audit:deep',
    },
    proton: {
      note: 'Bake is offline-safe. Deploy uses vault-injected CLOUDFLARE_API_TOKEN. Report HMAC uses REPORT_SIGNING_SECRET (mintable or pass://factorywager/Report Signing Secret/password when vaulted).',
      inject: 'bun run proton:inject:factorywager:reasonix',
      bakeVault: 'bun run compliance:bake:vault',
      reportSigning:
        'bun run vault:gap:mint-local  # REPORT_SIGNING_SECRET · or pass://factorywager/Report Signing Secret/password',
      vaultMap: 'docs/harness/tenants/proton-integration.md',
    },
  };

  const boardPath = joinPath(REG, 'compliance-board.json');
  await Bun.write(
    joinPath(REG, 'compliance-enhancements.json'),
    JSON.stringify(enhancements, null, 2) + '\n'
  );
  await Bun.write(joinPath(REG, 'compliance-shadow.json'), JSON.stringify(shadow, null, 2) + '\n');
  await Bun.write(boardPath, JSON.stringify(board, null, 2) + '\n');

  if (await Bun.file(PORTAL_HTML).exists()) {
    await bakeJsonEmbed(PORTAL_HTML, 'compliance-board-embed', board);
    if (log) console.info(`  baked embed → portal/compliance/index.html`);
  } else if (log) {
    console.warn(`  skip embed — missing ${PORTAL_HTML}`);
  }

  try {
    const { buildPortalWeavePayload } = await import('../lib/http/portal-weave.ts');
    const weave = buildPortalWeavePayload();
    await Bun.write(joinPath(REG, 'portal-weave.json'), JSON.stringify(weave, null, 2) + '\n');
    if (log) console.info(`  portal-weave.json refreshed`);
  } catch (e) {
    if (log) console.warn('  portal weave skip:', e instanceof Error ? e.message : e);
  }

  const ok = enhancements.passed === enhancements.total && shadow.summary.mismatches === 0;
  if (log) {
    console.info(
      `  enhancements ${enhancements.passed}/${enhancements.total} · shadow mismatches=${shadow.summary.mismatches}`
    );
    console.info(`  → ${boardPath}`);
  }

  return {
    ok,
    boardPath,
    generatedAt,
    enhancements: { passed: enhancements.passed, total: enhancements.total },
    shadowMismatches: shadow.summary.mismatches,
    hmac: Boolean(boardProof.hmac),
    board,
  };
}

async function main(): Promise<void> {
  const result = await bakeCompliancePortal();
  if (!result.ok) process.exitCode = 1;
}

if (import.meta.main) {
  await main();
}
