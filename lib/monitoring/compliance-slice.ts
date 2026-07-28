// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/bun-apis — Bun.mmap
/**
 * Compliance board → monitoring / ops-summary / dashboard slice.
 * Shape must stay aligned with getMonitoringData · ops-summary · portal tiles.
 *
 * Baked artifact: public/registry/compliance-board.json (`bun run compliance:bake`).
 */
import { joinPath } from '../path-bun.ts';

export type ComplianceMonitoringSlice = {
  available: boolean;
  ok: boolean;
  /** e.g. "8/8" when enhancement rows are present */
  enhancements: string | null;
  shadowMismatches: number | null;
  shadowAllow?: number | null;
  shadowBlock?: number | null;
  /** Discrete geo partner rows on the board */
  geoProfiles?: number | null;
  /** True when board integrity includes HMAC */
  hmac?: boolean;
  /** ZIP day-window proof from board.deepAudit */
  zipWindowOk?: boolean | null;
  scoreHint?: string | null;
  states?: string[];
  portal: '/portal/compliance/';
  path: '/registry/compliance-board.json';
  generatedAt?: string | null;
};

/** Alias for ops-summary consumers. */
export type ComplianceSummarySlice = ComplianceMonitoringSlice;

const REGISTRY_REL = 'public/registry/compliance-board.json';
export const COMPLIANCE_BOARD_PATH = '/registry/compliance-board.json' as const;
export const COMPLIANCE_PORTAL_PATH = '/portal/compliance/' as const;

type ComplianceBoardFile = {
  schemaVersion?: number;
  generatedAt?: string;
  enhancements?: { passed?: number; total?: number };
  shadow?: { summary?: { mismatches?: number; allow?: number; block?: number } };
  geo?: { partners?: unknown[] };
  deepAudit?: { zipWindow?: { ok?: boolean } };
  integrity?: {
    scoreHint?: string;
    proof?: { hmac?: string };
    checks?: Array<{ id?: string; ok?: boolean }>; // brand-ok — board integrity check key
  };
};

/**
 * Edge `/api/health` + local serve-public artifacts.complianceBoard shape.
 * Missing bake → exists:false (does not degrade). Present + fail → ok:false (degrades).
 */
export type ComplianceHealthArtifact = {
  exists: boolean;
  ok: boolean;
  generated: string | null;
  enhancements: string | null;
  shadowMismatches: number | null;
  /** Discrete geo partner count when board includes geo profiles */
  geoProfiles?: number | null;
  /** True when board integrity proof includes HMAC */
  hmac?: boolean;
  path: typeof COMPLIANCE_BOARD_PATH;
  portal: typeof COMPLIANCE_PORTAL_PATH;
};

function emptyHealthArtifact(): ComplianceHealthArtifact {
  return {
    exists: false,
    ok: false,
    generated: null,
    enhancements: null,
    shadowMismatches: null,
    geoProfiles: null,
    hmac: false,
    path: COMPLIANCE_BOARD_PATH,
    portal: COMPLIANCE_PORTAL_PATH,
  };
}

/**
 * Project raw board JSON into the freeze-shape health artifact.
 * Shared by Pages edge health and local serve-public (parity).
 * Wire edge: board JSON is untrusted until schemaVersion + projection.
 */
// eslint-disable-next-line harness/no-unknown-function-param -- registry JSON wire boundary
export function projectComplianceHealthArtifact(board: unknown): ComplianceHealthArtifact {
  if (!board || typeof board !== 'object') return emptyHealthArtifact();
  const raw = board as ComplianceBoardFile;
  if (raw.schemaVersion !== 1) return emptyHealthArtifact();
  const slice = projectBoard(raw);
  return {
    exists: true,
    ok: slice.ok,
    generated: slice.generatedAt ?? null,
    enhancements: slice.enhancements,
    shadowMismatches: slice.shadowMismatches,
    geoProfiles: slice.geoProfiles ?? null,
    hmac: Boolean(slice.hmac),
    path: COMPLIANCE_BOARD_PATH,
    portal: COMPLIANCE_PORTAL_PATH,
  };
}

function emptyUnavailable(): ComplianceMonitoringSlice {
  return {
    available: false,
    ok: false,
    enhancements: null,
    shadowMismatches: null,
    shadowAllow: null,
    shadowBlock: null,
    geoProfiles: null,
    hmac: false,
    zipWindowOk: null,
    scoreHint: null,
    states: ['MA', 'NJ'],
    portal: COMPLIANCE_PORTAL_PATH,
    path: COMPLIANCE_BOARD_PATH,
    generatedAt: null,
  };
}

/**
 * Pure board health — SSOT for server slice + portal/TOC client formulas.
 * When total===0: ok iff no shadow mismatches (and integrity if checks present).
 * When total>0: require full pass + zero mismatches + integrity checks.
 */
export function isComplianceBoardOk(board: {
  enhancements?: { passed?: number; total?: number };
  shadow?: { summary?: { mismatches?: number } };
  integrity?: { checks?: Array<{ ok?: boolean }> };
}): boolean {
  const passed = board.enhancements?.passed ?? 0;
  const total = board.enhancements?.total ?? 0;
  const mismatches = board.shadow?.summary?.mismatches ?? 0;
  const integrityOk =
    !Array.isArray(board.integrity?.checks) || board.integrity!.checks!.every(c => c?.ok !== false);
  if (total > 0) return passed === total && mismatches === 0 && integrityOk;
  return mismatches === 0 && integrityOk;
}

function projectBoard(board: ComplianceBoardFile): ComplianceMonitoringSlice {
  const enh = board.enhancements;
  const mismatches = board.shadow?.summary?.mismatches ?? 0;
  const passed = enh?.passed ?? 0;
  const total = enh?.total ?? 0;
  const ok = isComplianceBoardOk(board);
  const hasHmac = Boolean(board.integrity?.proof?.hmac);

  return {
    available: true,
    ok,
    enhancements: total > 0 ? `${passed}/${total}` : null,
    shadowMismatches: mismatches,
    shadowAllow: board.shadow?.summary?.allow ?? null,
    shadowBlock: board.shadow?.summary?.block ?? null,
    geoProfiles: Array.isArray(board.geo?.partners) ? board.geo!.partners!.length : null,
    hmac: hasHmac,
    zipWindowOk: board.deepAudit?.zipWindow?.ok ?? null,
    scoreHint: board.integrity?.scoreHint ?? (hasHmac ? 'integrity+hmac' : 'integrity-only'),
    states: ['MA', 'NJ'],
    generatedAt: board.generatedAt ?? null,
    path: COMPLIANCE_BOARD_PATH,
    portal: COMPLIANCE_PORTAL_PATH,
  };
}

function boardAbsPath(root = process.cwd()): string {
  return joinPath(root, REGISTRY_REL);
}

/**
 * Sync load for ops-summary / diagnose (Bun.mmap).
 */
export function loadComplianceSummarySliceSync(root = process.cwd()): ComplianceSummarySlice {
  const abs = boardAbsPath(root);
  try {
    const mapped = Bun.mmap(abs);
    const board = JSON.parse(new TextDecoder().decode(mapped)) as ComplianceBoardFile;
    return projectBoard(board);
  } catch {
    return emptyUnavailable();
  }
}

/**
 * Async load for monitoring collect / bake inject.
 * Returns `null` when the board is missing (optional plane).
 */
export async function loadComplianceMonitoringSlice(
  boardPath: string = REGISTRY_REL
): Promise<ComplianceMonitoringSlice | null> {
  try {
    const cf = Bun.file(boardPath);
    if (!(await cf.exists())) return null;
    const board = (await cf.json()) as ComplianceBoardFile;
    return projectBoard(board);
  } catch {
    return null;
  }
}

/** Sync alias used by ops-summary. */
export const loadComplianceSummarySlice = loadComplianceSummarySliceSync;
