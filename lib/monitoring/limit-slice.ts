// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/bun-apis — Bun.mmap
/**
 * Limit-raises bake → monitoring / health / portal slice.
 * Shape aligned with ops-summary.limitChanges consumers and /portal/limits/.
 *
 * Baked artifact: public/registry/limit-raises.json (`bun run ops:snapshot`).
 *
 * @see docs/harness/tenants/partner-limits.md
 * @see lib/monitoring/compliance-slice.ts — sibling projection pattern
 */
import { joinPath } from '../path-bun.ts';

export type LimitRaisesMonitoringSlice = {
  available: boolean;
  ok: boolean;
  partners: number | null;
  raises: number | null;
  lookbackHours: number | null;
  /** Pattern audit rows when bake includes connected patterns */
  patternNodes?: number | null;
  generatedAt?: string | null;
  portal: '/portal/limits/';
  path: '/registry/limit-raises.json';
};

/** Alias for ops-summary / diagnose consumers. */
export type LimitRaisesSummarySlice = LimitRaisesMonitoringSlice;

const REGISTRY_REL = 'public/registry/limit-raises.json';
export const LIMIT_RAISES_BOARD_PATH = '/registry/limit-raises.json' as const;
export const LIMIT_RAISES_PORTAL_PATH = '/portal/limits/' as const;

type LimitRaisesFile = {
  schemaVersion?: number;
  generatedAt?: string;
  lookbackHours?: number;
  partners?: number;
  raises?: number;
  byNode?: Record<string, { raises?: unknown[] }>;
  patterns?: { nodes?: number; partners?: number };
};

/**
 * Edge `/api/health` + local serve-public artifacts.limitRaises shape.
 * Missing bake → exists:false (does not degrade). Present + schema ok → ok:true.
 */
export type LimitRaisesHealthArtifact = {
  exists: boolean;
  ok: boolean;
  generated: string | null;
  partners: number | null;
  raises: number | null;
  lookbackHours: number | null;
  path: typeof LIMIT_RAISES_BOARD_PATH;
  portal: typeof LIMIT_RAISES_PORTAL_PATH;
};

function emptyHealthArtifact(): LimitRaisesHealthArtifact {
  return {
    exists: false,
    ok: false,
    generated: null,
    partners: null,
    raises: null,
    lookbackHours: null,
    path: LIMIT_RAISES_BOARD_PATH,
    portal: LIMIT_RAISES_PORTAL_PATH,
  };
}

function emptyUnavailable(): LimitRaisesMonitoringSlice {
  return {
    available: false,
    ok: false,
    partners: null,
    raises: null,
    lookbackHours: null,
    patternNodes: null,
    generatedAt: null,
    path: LIMIT_RAISES_BOARD_PATH,
    portal: LIMIT_RAISES_PORTAL_PATH,
  };
}

function countFromByNode(byNode: LimitRaisesFile['byNode']): {
  partners: number;
  raises: number;
} {
  if (!byNode || typeof byNode !== 'object') return { partners: 0, raises: 0 };
  const partners = Object.keys(byNode).length;
  let raises = 0;
  for (const bucket of Object.values(byNode)) {
    raises += Array.isArray(bucket?.raises) ? bucket.raises.length : 0;
  }
  return { partners, raises };
}

function projectFile(raw: LimitRaisesFile): LimitRaisesMonitoringSlice {
  if (raw.schemaVersion !== 1) return emptyUnavailable();
  const counted = countFromByNode(raw.byNode);
  const partners =
    typeof raw.partners === 'number' && Number.isFinite(raw.partners)
      ? raw.partners
      : counted.partners;
  const raises =
    typeof raw.raises === 'number' && Number.isFinite(raw.raises) ? raw.raises : counted.raises;
  const lookbackHours =
    typeof raw.lookbackHours === 'number' && Number.isFinite(raw.lookbackHours)
      ? raw.lookbackHours
      : null;
  const patternNodes =
    typeof raw.patterns?.nodes === 'number' && Number.isFinite(raw.patterns.nodes)
      ? raw.patterns.nodes
      : null;

  return {
    available: true,
    // Bake is informational; empty window is still a healthy artifact
    ok: true,
    partners,
    raises,
    lookbackHours,
    patternNodes,
    generatedAt: raw.generatedAt ?? null,
    path: LIMIT_RAISES_BOARD_PATH,
    portal: LIMIT_RAISES_PORTAL_PATH,
  };
}

/**
 * Project raw limit-raises JSON into the freeze-shape health artifact.
 * Wire edge: bake JSON is untrusted until schemaVersion + projection.
 */
// eslint-disable-next-line harness/no-unknown-function-param -- registry JSON wire boundary
export function projectLimitRaisesHealthArtifact(board: unknown): LimitRaisesHealthArtifact {
  if (!board || typeof board !== 'object') return emptyHealthArtifact();
  const raw = board as LimitRaisesFile;
  if (raw.schemaVersion !== 1) return emptyHealthArtifact();
  const slice = projectFile(raw);
  return {
    exists: true,
    ok: slice.ok,
    generated: slice.generatedAt ?? null,
    partners: slice.partners,
    raises: slice.raises,
    lookbackHours: slice.lookbackHours,
    path: LIMIT_RAISES_BOARD_PATH,
    portal: LIMIT_RAISES_PORTAL_PATH,
  };
}

function boardAbsPath(root = process.cwd()): string {
  return joinPath(root, REGISTRY_REL);
}

/** Sync load for diagnose / tools (Bun.mmap). */
export function loadLimitRaisesSummarySliceSync(root = process.cwd()): LimitRaisesSummarySlice {
  const abs = boardAbsPath(root);
  try {
    const mapped = Bun.mmap(abs);
    const board = JSON.parse(new TextDecoder().decode(mapped)) as LimitRaisesFile;
    return projectFile(board);
  } catch {
    return emptyUnavailable();
  }
}

/**
 * Async load for monitoring collect / bake inject.
 * Returns `null` when the bake is missing (optional plane).
 */
export async function loadLimitRaisesMonitoringSlice(
  boardPath: string = REGISTRY_REL
): Promise<LimitRaisesMonitoringSlice | null> {
  try {
    const cf = Bun.file(boardPath);
    if (!(await cf.exists())) return null;
    const board = (await cf.json()) as LimitRaisesFile;
    return projectFile(board);
  } catch {
    return null;
  }
}

export const loadLimitRaisesSummarySlice = loadLimitRaisesSummarySliceSync;
