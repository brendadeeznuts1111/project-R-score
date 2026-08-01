// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Read-only seat-intake → TOC rails projection.
 *
 * Soft Balance / MessageLog mutations stay in toc-ops-repo. This bridge only
 * overlays deposit-rail hints from Factory seat intake onto matching TOC
 * partners by partnerCode (no Soft writes).
 *
 * @see docs/harness/tenants/seat-capital-desk.md
 * @see docs/harness/tenants/toc-ops.md
 */
import {
  isOutDeferred,
  normalizeSeatIntake,
  SEAT_INTAKE_DIR,
  type SeatIntakeRecord,
  type SeatOut,
} from '../telegram/seat-capital-desk.ts';
import type { TocOpsSnapshot, TocPartner, TocRail, TocRailType } from './types.ts';

export type SeatDeskRailProjection = {
  partnerCode: string;
  callSign: string;
  rails: TocRail[];
  source: 'seat-intake';
};

function mapRailType(raw: string | undefined): TocRailType {
  const s = (raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
  if (s === 'venmo') return 'Venmo';
  if (s === 'cashapp' || s === 'cash') return 'CashApp';
  if (s === 'paypal') return 'PayPal';
  if (s === 'house') return 'House';
  return 'Other';
}

function outRail(out: SeatOut, index: number, defRail?: string, defSend?: string): TocRail | null {
  const railRaw = (out.paymentRail ?? defRail ?? '').trim();
  const sendTo = (out.sendTo ?? defSend ?? '').trim();
  if (!railRaw && !sendTo) return null;
  const railType = mapRailType(railRaw || 'Other');
  const confirmed = Boolean(railRaw && sendTo);
  const outId = (out.outId ?? `out-${index + 1}`).toUpperCase();
  return {
    id: `seat-${outId}`,
    railType,
    label: railRaw || railType,
    confirmed,
    destinationHint: sendTo || undefined,
  };
}

/** Unique rails from one intake record (passwordless). */
export function projectSeatIntakeToTocRails(record: SeatIntakeRecord): SeatDeskRailProjection {
  const hydrated = normalizeSeatIntake(record);
  const defRail = hydrated.defaultPaymentRail?.trim();
  const defSend = hydrated.defaultSendTo?.trim();
  const seen = new Set<string>();
  const rails: TocRail[] = [];
  for (let i = 0; i < hydrated.outs.length; i++) {
    const out = hydrated.outs[i]!;
    if (isOutDeferred(out)) continue;
    const rail = outRail(out, i, defRail, defSend);
    if (!rail) continue;
    const key = `${rail.railType}|${rail.destinationHint ?? ''}|${rail.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rails.push(rail);
  }
  return {
    partnerCode: hydrated.partnerCode.toUpperCase(),
    callSign: hydrated.callSign,
    rails,
    source: 'seat-intake',
  };
}

/** Scan seat intake dir → projections (empty when dir missing). */
export async function loadSeatDeskRailProjections(
  intakeDir: string = SEAT_INTAKE_DIR
): Promise<SeatDeskRailProjection[]> {
  const out: SeatDeskRailProjection[] = [];
  try {
    const glob = new Bun.Glob('*.json');
    for await (const rel of glob.scan(intakeDir)) {
      try {
        const raw = (await Bun.file(`${intakeDir}/${rel}`).json()) as SeatIntakeRecord;
        out.push(projectSeatIntakeToTocRails(raw));
      } catch {
        /* skip malformed */
      }
    }
  } catch {
    /* missing dir */
  }
  out.sort((a, b) => a.callSign.localeCompare(b.callSign));
  return out;
}

/** Recount confirmed/unconfirmed/seat-sourced rails across all partners. */
function recomputeRailSummary(partners: readonly TocPartner[]): {
  confirmedRails: number;
  unconfirmedRails: number;
  seatSourcedRails: number;
} {
  let confirmedRails = 0;
  let unconfirmedRails = 0;
  let seatSourcedRails = 0;
  for (const p of partners) {
    for (const r of p.rails) {
      if (r.confirmed) confirmedRails++;
      else unconfirmedRails++;
      if (String(r.id).startsWith('seat-')) seatSourcedRails++;
    }
  }
  return { confirmedRails, unconfirmedRails, seatSourcedRails };
}

/**
 * Overlay seat-derived rails onto TOC partners that share partnerCode.
 * Keeps Soft/demo rails that are not seat-sourced (`id` not starting with `seat-`).
 * Replaces prior `seat-*` rails from a previous bake.
 *
 * Also refreshes `summary.confirmedRails` / `unconfirmedRails` (previously
 * computed pre-merge and undercounting seat rails) and adds
 * `summary.seatSourcedRails` so ops/TOC glance can surface the overlay
 * instead of leaving it invisible in the merged `partners[].rails[]` array.
 */
export function mergeSeatDeskRailsIntoToc(
  snap: TocOpsSnapshot,
  projections: readonly SeatDeskRailProjection[]
): TocOpsSnapshot {
  if (projections.length === 0) return snap;
  const byCode = new Map(projections.map(p => [p.partnerCode.toUpperCase(), p]));
  const partners: TocPartner[] = snap.partners.map(partner => {
    const proj = byCode.get(partner.partnerCode.toUpperCase());
    if (!proj || proj.rails.length === 0) return partner;
    const kept = partner.rails.filter(r => !String(r.id).startsWith('seat-'));
    return {
      ...partner,
      rails: [...kept, ...proj.rails],
    };
  });
  return {
    ...snap,
    partners,
    summary: {
      ...snap.summary,
      ...recomputeRailSummary(partners),
    },
    generatedAt: snap.generatedAt,
  };
}

/** Convenience: load intake + merge into fixture (read-only overlay). */
export async function withSeatDeskRailsFromIntake(
  snap: TocOpsSnapshot,
  opts?: { root?: string; intakeDir?: string }
): Promise<TocOpsSnapshot> {
  const root = opts?.root ?? process.cwd();
  const intakeDir =
    opts?.intakeDir ??
    (root.endsWith('/') ? `${root}${SEAT_INTAKE_DIR}` : `${root}/${SEAT_INTAKE_DIR}`);
  const projections = await loadSeatDeskRailProjections(intakeDir);
  return mergeSeatDeskRailsIntoToc(snap, projections);
}
