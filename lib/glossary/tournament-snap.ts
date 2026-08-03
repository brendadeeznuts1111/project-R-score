// @see https://bun.com/docs/runtime/file-io — Bun.file
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

/**
 * Parse a warehouse snap key into tournament + optional region + gender.
 *
 * Patterns:
 *   setka_cup
 *   setka_cup_ua_w
 *   setka_cup_w
 *   tournament.setka_cup  (already a glossary id — treated as bare tournament)
 */
export function parseTournamentSnap(raw: string): TournamentSnapParts | null {
  let snap = raw
    .trim()
    .toLowerCase()
    .replace(/^tournament\./, '');
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
  for (const key of TOURNAMENT_PREFIXES) {
    if (snap === key) {
      tournamentKey = key;
      rest = '';
      break;
    }
    if (snap.startsWith(`${key}_`)) {
      tournamentKey = key;
      rest = snap.slice(key.length + 1);
      break;
    }
  }
  if (!tournamentKey) {
    // Fallback: last _w/_m as gender, middle as region, rest as tournament
    const parts = snap.split('_').filter(Boolean);
    if (parts.length === 0) return null;
    const last = parts[parts.length - 1]!;
    const gender = GENDER_SUFFIX[last] ?? null;
    if (gender && parts.length >= 2) {
      const regionCand = parts[parts.length - 2]!;
      const region = /^[a-z]{2}$/.test(regionCand) ? regionCand : null;
      const tourParts = region ? parts.slice(0, -2) : parts.slice(0, -1);
      tournamentKey = tourParts.join('_');
      rest = [region, last].filter(Boolean).join('_');
    } else {
      tournamentKey = snap;
      rest = '';
    }
  }

  let region: string | null = null;
  let gender: SnapGender = null;
  if (rest) {
    const segs = rest.split('_').filter(Boolean);
    if (segs.length === 1) {
      const s = segs[0]!;
      if (GENDER_SUFFIX[s]) gender = GENDER_SUFFIX[s]!;
      else if (/^[a-z]{2}$/.test(s)) region = s;
      else region = s;
    } else if (segs.length >= 2) {
      const last = segs[segs.length - 1]!;
      gender = GENDER_SUFFIX[last] ?? null;
      const regionCand = segs[segs.length - 2]!;
      region = /^[a-z]{2}$/.test(regionCand) ? regionCand : segs.slice(0, -1).join('_');
      if (!gender) {
        region = segs.join('_');
      }
    }
  }

  return {
    snap: raw.trim(),
    tournamentKey,
    glossaryId: `tournament.${tournamentKey}`,
    region,
    gender,
    tournamentLabel: TOURNAMENT_LABELS[tournamentKey] ?? tournamentKey.replace(/_/g, ' '),
  };
}

async function loadJsonIds(
  path: string
): Promise<{ ids: Set<string>; labels: Map<string, string> }> {
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
  } catch {
    /* ignore parse errors */
  }
  return { ids, labels };
}

export type OwnershipLookupPaths = {
  domainGlossary?: string;
  tennisHqColors?: string;
};

export async function findTournamentOwnership(
  glossaryId: string, // brand-ok — glossary concept key
  paths: OwnershipLookupPaths = {}
): Promise<GlossaryHit | null> {
  const domainPath =
    paths.domainGlossary ?? joinPath(REPO_ROOT, 'public/registry/domain-glossary.json');

  const domain = await loadJsonIds(domainPath);
  if (domain.ids.has(glossaryId)) {
    return {
      source: 'domain-glossary',
      path: domainPath,
      label: domain.labels.get(glossaryId),
    };
  }

  // Tennis HQ packages may live only on the primary checkout (not always in worktrees).
  const tennisCandidates = [
    paths.tennisHqColors,
    joinPath(
      REPO_ROOT,
      'king-zippy-umbra-acre/packages/tennis-hq-ssot/registry/glossary-colors.json'
    ),
    joinPath(
      REPO_ROOT,
      '..',
      'Projects',
      'king-zippy-umbra-acre/packages/tennis-hq-ssot/registry/glossary-colors.json'
    ),
  ].filter((x): x is string => typeof x === 'string' && x.length > 0);

  for (const tennisPath of tennisCandidates) {
    if (!(await Bun.file(tennisPath).exists())) continue;
    const tennis = await loadJsonIds(tennisPath);
    if (tennis.ids.has(glossaryId)) {
      return {
        source: 'tennis-hq-colors',
        path: tennisPath,
        label: tennis.labels.get(glossaryId),
      };
    }
  }

  // Known map: series tournaments always owned conceptually even if bake lag
  const key = glossaryId.replace(/^tournament\./, '');
  if ((KNOWN_TOURNAMENT_KEYS as readonly string[]).includes(key)) {
    return {
      source: 'known-map',
      path: 'lib/glossary/tournament-snap.ts#KNOWN_TOURNAMENT_KEYS',
      label: TOURNAMENT_LABELS[key],
    };
  }

  return null;
}

export async function verifyTournamentSnapOwnership(
  snap: string, // brand-ok — warehouse snap key
  paths?: OwnershipLookupPaths
): Promise<TournamentOwnershipReport> {
  const issues: string[] = [];
  const parts = parseTournamentSnap(snap);
  if (!parts) {
    return {
      snap,
      ok: false,
      parts: null,
      ownedBy: null,
      issues: [`unparseable snap key: ${snap}`],
      proposeHint: `bun run concept:propose -- --id tournament.${snap} --label "${snap}" --domain trading --category tournament`,
    };
  }

  const ownedBy = await findTournamentOwnership(parts.glossaryId, paths);
  if (!ownedBy) {
    issues.push(`glossary leaf missing: ${parts.glossaryId}`);
  }

  // Facets are not required to be glossary leaves — but warn if unknown tournament series
  if (!(KNOWN_TOURNAMENT_KEYS as readonly string[]).includes(parts.tournamentKey)) {
    issues.push(`tournament key not in KNOWN_TOURNAMENT_KEYS: ${parts.tournamentKey}`);
  }

  const ok = issues.length === 0 && ownedBy !== null;
  return {
    snap,
    ok,
    parts,
    ownedBy,
    issues,
    proposeHint: ok
      ? undefined
      : `bun run concept:propose -- --id ${parts.glossaryId} --label "${parts.tournamentLabel}" --domain trading --category tournament --summary "Table tennis tournament series (snap facets: region/gender on warehouse rows)"`,
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
