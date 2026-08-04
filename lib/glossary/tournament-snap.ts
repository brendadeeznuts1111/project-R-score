// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Tournament snap ownership — map composite snap keys to glossary tournament leaves.
 *
 * Hierarchy (Tennis HQ / table-tennis classify):
 *   sport → league → series → **tournament** (setka_cup, …) → gender → match
 *
 * Warehouse snaps often encode tournament + region + gender as one token:
 *   setka_cup_ua_w  →  tournament.setka_cup + region=ua + gender=FEMALE
 *
 * Ownership is on the **tournament** leaf (`tournament.setka_cup`), not on every
 * region/gender edition. Snaps are facets; glossary owns the series tournament.
 *
 * @see king-zippy-umbra-acre/src/lib/tennis-hq/table-tennis/classify.ts
 * @see king-zippy-umbra-acre/docs/MAPPING.md
 */

import { joinPath } from '../path-bun.ts';

const REPO_ROOT = joinPath(import.meta.dir, '..', '..');

/** Safe snap / id token for shell hints (alphanumeric, underscore, dot, hyphen). */
const SAFE_SNAP_RE = /^[a-zA-Z0-9._-]+$/;

export type SnapGender = 'MALE' | 'FEMALE' | 'MIXED' | null;

export type TournamentSnapParts = {
  /** Raw snap key (e.g. setka_cup_ua_w). */
  snap: string; // brand-ok — warehouse snap key
  /** Glossary tournament key without prefix (setka_cup). */
  tournamentKey: string; // brand-ok — tournament key
  /** Full glossary concept id (tournament.setka_cup). */
  glossaryId: string; // brand-ok — glossary concept key
  region: string | null;
  gender: SnapGender;
  /** Human label for the tournament series. */
  tournamentLabel: string;
};

export type GlossaryHit = {
  source: 'domain-glossary' | 'tennis-hq-colors' | 'concept-registry' | 'known-map';
  path: string;
  label?: string;
};

export type TournamentOwnershipReport = {
  snap: string; // brand-ok — warehouse snap key
  ok: boolean;
  parts: TournamentSnapParts | null;
  ownedBy: GlossaryHit | null;
  issues: string[];
  /** Suggested concept:propose CLI if ownership is missing. */
  proposeHint?: string;
};

/** Known series tournaments (Tennis HQ TableTennisTournamentKey minus unknown). */
export const KNOWN_TOURNAMENT_KEYS = [
  'setka_cup',
  'ittf_world',
  'wtt_champions',
  'wtt_contender',
  'wtt_star_contender',
  'wtt_feeder',
] as const;

export type KnownTournamentKey = (typeof KNOWN_TOURNAMENT_KEYS)[number];

const TOURNAMENT_LABELS: Record<string, string> = {
  setka_cup: 'Setka Cup',
  ittf_world: 'ITTF World',
  wtt_champions: 'WTT Champions',
  wtt_contender: 'WTT Contender',
  wtt_star_contender: 'WTT Star Contender',
  wtt_feeder: 'WTT Feeder',
};

const GENDER_SUFFIX: Record<string, SnapGender> = {
  m: 'MALE',
  men: 'MALE',
  male: 'MALE',
  w: 'FEMALE',
  women: 'FEMALE',
  female: 'FEMALE',
  x: 'MIXED',
  mixed: 'MIXED',
};

/** Longest-first so setka_cup matches before setka. */
const TOURNAMENT_PREFIXES = [...KNOWN_TOURNAMENT_KEYS].sort((a, b) => b.length - a.length);

function isIso2Region(s: string): boolean {
  return /^[a-z]{2}$/.test(s);
}

/**
 * Parse region + gender facets after a known tournament key.
 * Valid: empty | gender | iso2 | iso2_gender. Anything else → null (malformed).
 */
function parseKnownFacets(rest: string): { region: string | null; gender: SnapGender } | null {
  if (!rest) return { region: null, gender: null };
  const segs = rest.split('_').filter(Boolean);
  if (segs.length === 1) {
    const s = segs[0]!;
    if (GENDER_SUFFIX[s]) return { region: null, gender: GENDER_SUFFIX[s]! };
    if (isIso2Region(s)) return { region: s, gender: null };
    return null;
  }
  if (segs.length === 2) {
    const regionCand = segs[0]!;
    const last = segs[1]!;
    const gender = GENDER_SUFFIX[last] ?? null;
    if (!gender || !isIso2Region(regionCand)) return null;
    return { region: regionCand, gender };
  }
  return null;
}

/**
 * Parse a warehouse snap key into tournament + optional region + gender.
 *
 * Patterns:
 *   setka_cup
 *   setka_cup_ua_w
 *   setka_cup_w
 *   tournament.setka_cup  (already a glossary id — treated as bare tournament)
 *
 * Malformed known-prefix facets (e.g. setka_cup_ua_z, setka_cup_usa_w) → null.
 * Region/gender-only keys (e.g. ua_w) → null (no tournament series).
 */
export function parseTournamentSnap(raw: string): TournamentSnapParts | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Warehouse snaps are alphanumeric keys only — reject shell-meta noise early.
  if (!SAFE_SNAP_RE.test(trimmed)) return null;
  let snap = trimmed.toLowerCase().replace(/^tournament\./, '');
  if (!snap) return null;

  // Already a bare tournament key
  if ((KNOWN_TOURNAMENT_KEYS as readonly string[]).includes(snap)) {
    return {
      snap: raw.trim(),
      tournamentKey: snap,
      glossaryId: `tournament.${snap}`,
      region: null,
      gender: null,
      tournamentLabel: TOURNAMENT_LABELS[snap] ?? snap,
    };
  }

  let tournamentKey: string | null = null;
  let rest = '';
  let knownPrefix = false;
  for (const key of TOURNAMENT_PREFIXES) {
    if (snap === key) {
      tournamentKey = key;
      rest = '';
      knownPrefix = true;
      break;
    }
    if (snap.startsWith(`${key}_`)) {
      tournamentKey = key;
      rest = snap.slice(key.length + 1);
      knownPrefix = true;
      break;
    }
  }

  let region: string | null = null;
  let gender: SnapGender = null;

  if (knownPrefix && tournamentKey) {
    const facets = parseKnownFacets(rest);
    if (!facets) return null;
    region = facets.region;
    gender = facets.gender;
  } else {
    // Fallback: last _w/_m as gender, optional iso2 region, rest as tournament
    const parts = snap.split('_').filter(Boolean);
    if (parts.length === 0) return null;
    const last = parts[parts.length - 1]!;
    const g = GENDER_SUFFIX[last] ?? null;
    if (g && parts.length >= 2) {
      const regionCand = parts[parts.length - 2]!;
      const hasRegion = isIso2Region(regionCand);
      const tourParts = hasRegion ? parts.slice(0, -2) : parts.slice(0, -1);
      tournamentKey = tourParts.join('_');
      if (!tournamentKey) return null;
      region = hasRegion ? regionCand : null;
      gender = g;
    } else {
      tournamentKey = snap;
    }
  }

  if (!tournamentKey) return null;

  return {
    snap: raw.trim(),
    tournamentKey,
    glossaryId: `tournament.${tournamentKey}`,
    region,
    gender,
    tournamentLabel: TOURNAMENT_LABELS[tournamentKey] ?? tournamentKey.replace(/_/g, ' '),
  };
}

type LoadJsonResult = {
  ids: Set<string>;
  labels: Map<string, string>;
  /** Set when the file exists but JSON/schema parse failed. */
  error?: string;
};

async function loadJsonIds(path: string): Promise<LoadJsonResult> {
  const ids = new Set<string>();
  const labels = new Map<string, string>();
  const file = Bun.file(path);
  if (!(await file.exists())) return { ids, labels };
  try {
    const raw = (await file.json()) as unknown;
    // domain-glossary: { concepts: [{ id, label }] }
    if (raw && typeof raw === 'object' && Array.isArray((raw as { concepts?: unknown }).concepts)) {
      for (const c of (raw as { concepts: Array<{ id?: string; label?: string }> }).concepts) {
        // brand-ok — glossary wire ids
        if (typeof c.id === 'string') {
          ids.add(c.id);
          if (typeof c.label === 'string') labels.set(c.id, c.label);
        }
      }
    }
    // tennis-hq glossary-colors: { entries: { [id]: { id, label } } }
    if (raw && typeof raw === 'object' && (raw as { entries?: unknown }).entries) {
      const entries = (raw as { entries: Record<string, { id?: string; label?: string }> }).entries; // brand-ok — glossary wire ids
      for (const [k, v] of Object.entries(entries)) {
        const id = typeof v?.id === 'string' ? v.id : k; // brand-ok — glossary concept key
        ids.add(id);
        if (typeof v?.label === 'string') labels.set(id, v.label);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ids, labels, error: `failed to parse ${path}: ${msg}` };
  }
  return { ids, labels };
}

export type OwnershipLookupPaths = {
  domainGlossary?: string;
  tennisHqColors?: string;
};

export type OwnershipLookupResult = {
  hit: GlossaryHit | null;
  issues: string[];
};

function tennisHqColorsCandidates(explicit?: string): string[] {
  // Explicit path pins lookup for tests / callers — no env or in-repo defaults.
  if (explicit !== undefined) {
    return explicit.length > 0 ? [explicit] : [];
  }
  const out: string[] = [];
  const envDir = Bun.env.TENNIS_HQ_SSOT_DIR?.trim();
  if (envDir) {
    out.push(joinPath(envDir, 'registry/glossary-colors.json'));
    out.push(joinPath(envDir, 'glossary-colors.json'));
  }
  out.push(
    joinPath(
      REPO_ROOT,
      'king-zippy-umbra-acre/packages/tennis-hq-ssot/registry/glossary-colors.json'
    )
  );
  return out.filter((p, i, a) => p.length > 0 && a.indexOf(p) === i);
}

export async function findTournamentOwnership(
  glossaryId: string, // brand-ok — glossary concept key
  paths: OwnershipLookupPaths = {}
): Promise<OwnershipLookupResult> {
  const issues: string[] = [];
  const domainPath =
    paths.domainGlossary ?? joinPath(REPO_ROOT, 'public/registry/domain-glossary.json');

  const domainFile = Bun.file(domainPath);
  if (await domainFile.exists()) {
    const domain = await loadJsonIds(domainPath);
    if (domain.error) {
      issues.push(domain.error);
      // Do not fall through to known-map while domain-glossary is present but unreadable.
      return { hit: null, issues };
    }
    if (domain.ids.has(glossaryId)) {
      return {
        hit: {
          source: 'domain-glossary',
          path: domainPath,
          label: domain.labels.get(glossaryId),
        },
        issues,
      };
    }
  }

  for (const tennisPath of tennisHqColorsCandidates(paths.tennisHqColors)) {
    if (!(await Bun.file(tennisPath).exists())) continue;
    const tennis = await loadJsonIds(tennisPath);
    if (tennis.error) {
      issues.push(tennis.error);
      continue;
    }
    if (tennis.ids.has(glossaryId)) {
      return {
        hit: {
          source: 'tennis-hq-colors',
          path: tennisPath,
          label: tennis.labels.get(glossaryId),
        },
        issues,
      };
    }
  }

  // Known map: series tournaments always owned conceptually even if bake lag
  const key = glossaryId.replace(/^tournament\./, '');
  if ((KNOWN_TOURNAMENT_KEYS as readonly string[]).includes(key)) {
    return {
      hit: {
        source: 'known-map',
        path: 'lib/glossary/tournament-snap.ts#KNOWN_TOURNAMENT_KEYS',
        label: TOURNAMENT_LABELS[key],
      },
      issues,
    };
  }

  return { hit: null, issues };
}

function safeProposeToken(value: string, fallback: string): string {
  return SAFE_SNAP_RE.test(value) ? value : fallback;
}

export async function verifyTournamentSnapOwnership(
  snap: string, // brand-ok — warehouse snap key
  paths?: OwnershipLookupPaths
): Promise<TournamentOwnershipReport> {
  const issues: string[] = [];
  const parts = parseTournamentSnap(snap);
  if (!parts) {
    const safe = safeProposeToken(
      snap
        .trim()
        .toLowerCase()
        .replace(/^tournament\./, ''),
      'unknown'
    );
    return {
      snap,
      ok: false,
      parts: null,
      ownedBy: null,
      issues: [`unparseable snap key: ${snap}`],
      proposeHint: `bun run concept:propose -- --id tournament.${safe} --label "${safe}" --domain trading --category tournament`,
    };
  }

  const { hit: ownedBy, issues: lookupIssues } = await findTournamentOwnership(
    parts.glossaryId,
    paths
  );
  issues.push(...lookupIssues);
  if (!ownedBy) {
    issues.push(`glossary leaf missing: ${parts.glossaryId}`);
  }

  // Facets are not required to be glossary leaves — but warn if unknown tournament series
  if (!(KNOWN_TOURNAMENT_KEYS as readonly string[]).includes(parts.tournamentKey)) {
    issues.push(`tournament key not in KNOWN_TOURNAMENT_KEYS: ${parts.tournamentKey}`);
  }

  const ok = issues.length === 0 && ownedBy !== null;
  const safeId = safeProposeToken(parts.glossaryId, 'tournament.unknown');
  const safeLabel = parts.tournamentLabel.replace(/["`$\\]/g, '');
  return {
    snap,
    ok,
    parts,
    ownedBy,
    issues,
    proposeHint: ok
      ? undefined
      : `bun run concept:propose -- --id ${safeId} --label "${safeLabel}" --domain trading --category tournament --summary "Table tennis tournament series (snap facets: region/gender on warehouse rows)"`,
  };
}

export function formatOwnershipReport(report: TournamentOwnershipReport): string {
  const lines: string[] = [];
  const mark = report.ok ? '✓' : '✗';
  lines.push(`${mark} Tournament snap ownership · ${report.snap}`);
  if (report.parts) {
    lines.push(`  tournamentKey  ${report.parts.tournamentKey}`);
    lines.push(`  glossaryId     ${report.parts.glossaryId}`);
    lines.push(`  region         ${report.parts.region ?? '—'}`);
    lines.push(`  gender         ${report.parts.gender ?? '—'}`);
    lines.push(`  label          ${report.parts.tournamentLabel}`);
  }
  if (report.ownedBy) {
    lines.push(
      `  ownedBy        ${report.ownedBy.source} · ${report.ownedBy.label ?? report.parts?.glossaryId}`
    );
    lines.push(`  sourcePath     ${report.ownedBy.path}`);
  } else {
    lines.push(`  ownedBy        —`);
  }
  for (const issue of report.issues) {
    lines.push(`  issue          ${issue}`);
  }
  if (report.proposeHint) {
    lines.push(`  propose        ${report.proposeHint}`);
  }
  return lines.join('\n');
}
