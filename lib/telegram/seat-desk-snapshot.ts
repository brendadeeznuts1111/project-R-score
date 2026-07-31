// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/bun-apis — Bun.mmap
/**
 * SPEN seat capital desk snapshot for portal / ops-summary bake.
 *
 *   public/registry/seat-capital-desk.json  — redacted rows (view model, no passwords)
 *   ops-summary.seatCapitalDesk             — rollup slice
 *
 * Mirrors lib/telegram/handshake-snapshot.ts (telegram-handshake bake pattern).
 */
import {
  buildSeatDeskViewModel,
  formatOutId,
  normalizeSeatIntake,
  SEAT_INTAKE_DIR,
  type SeatDeskOutView,
  type SeatDeskViewModel,
  type SeatIntakeRecord,
} from './seat-capital-desk.ts';
import { formatBookMaxDeltaLine, tryLoadBookMaxComparesForSeatDesk } from './seat-desk-book-max.ts';
import {
  SEAT_DESK_PARTNER_MESSAGE_TEMPLATES,
  summarizeSeatDeskPartnerView,
  type SeatDeskPartnerMessageTemplateSpec,
  type SeatDeskPartnerView,
} from './seat-desk-partner-message.ts';

export const SEAT_CAPITAL_DESK_REGISTRY_REL = 'public/registry/seat-capital-desk.json';
export const SEAT_CAPITAL_DESK_REGISTRY_PATH = '/registry/seat-capital-desk.json' as const;

const SEAT_CAPITAL_DESK_COMMANDS = {
  refresh: 'bun run seat:desk:refresh',
  post: 'bun run seat:desk:post',
  update: 'bun run seat:desk:update',
  partnerMessage: 'bun run seat:desk:partner-message CALL --json',
  partnerMessageTodo: 'bun run seat:desk:partner-message CALL --template todo',
} as const;

export type SeatCapitalDeskSnapshot = {
  schema: 'factorywager.seat-capital-desk.v1';
  generatedAt: string;
  desks: number;
  blocked: number;
  partial: number;
  ready: number;
  funded: number;
  incompleteOuts: number;
  rows: SeatDeskViewModel[];
  /** Partner-message panel projection (passwordless). */
  partnerViews: SeatDeskPartnerView[];
  /** Template SSOT for portal chips / CLI hints. */
  partnerMessageTemplates: SeatDeskPartnerMessageTemplateSpec[];
  commands: typeof SEAT_CAPITAL_DESK_COMMANDS;
};

export type SeatCapitalDeskSummarySlice = {
  available: boolean;
  path: typeof SEAT_CAPITAL_DESK_REGISTRY_PATH;
  generatedAt: string | null;
  desks: number;
  blocked: number;
  partial: number;
  ready: number;
  funded: number;
  incompleteOuts: number;
  rows: SeatDeskViewModel[];
  partnerViews: SeatDeskPartnerView[];
  partnerMessageTemplates: SeatDeskPartnerMessageTemplateSpec[];
  commands: typeof SEAT_CAPITAL_DESK_COMMANDS;
};

export function emptySeatCapitalDeskSummarySlice(): SeatCapitalDeskSummarySlice {
  return {
    available: false,
    path: SEAT_CAPITAL_DESK_REGISTRY_PATH,
    generatedAt: null,
    desks: 0,
    blocked: 0,
    partial: 0,
    ready: 0,
    funded: 0,
    incompleteOuts: 0,
    rows: [],
    partnerViews: [],
    partnerMessageTemplates: Object.values(SEAT_DESK_PARTNER_MESSAGE_TEMPLATES),
    commands: SEAT_CAPITAL_DESK_COMMANDS,
  };
}

/**
 * Best-effort attach of book-max vs maxBet lines from ops SQLite.
 * No-op when DB/node missing — never dual-writes desk terms into limits.
 */
function enrichViewModelBookMax(
  record: SeatIntakeRecord,
  vm: SeatDeskViewModel
): SeatDeskViewModel {
  const compares = tryLoadBookMaxComparesForSeatDesk(record);
  if (!compares) return vm;
  const outs: SeatDeskOutView[] = vm.outs.map((out, i) => {
    const outId = (record.outs[i]?.outId ?? formatOutId(record.partnerCode, i)).toUpperCase();
    const compare = compares.get(outId) ?? null;
    return {
      ...out,
      bookMaxLine: formatBookMaxDeltaLine({
        bookMax: compare?.bookMax ?? null,
        deskMaxBet: out.maxBet === '—' ? undefined : out.maxBet,
      }),
    };
  });
  return { ...vm, outs };
}

/**
 * Scan `*.json` intake files under `intakeDir` (default `SEAT_INTAKE_DIR`),
 * normalize + map each to the passwordless view model, sorted by callSign.
 */
export async function buildSeatCapitalDeskSnapshot(
  intakeDir: string = SEAT_INTAKE_DIR
): Promise<SeatCapitalDeskSnapshot> {
  const rows: SeatDeskViewModel[] = [];
  const partnerViews: SeatDeskPartnerView[] = [];
  try {
    const glob = new Bun.Glob('*.json');
    for await (const rel of glob.scan(intakeDir)) {
      try {
        const raw = (await Bun.file(`${intakeDir}/${rel}`).json()) as SeatIntakeRecord;
        const record = normalizeSeatIntake(raw);
        const vm = buildSeatDeskViewModel(record);
        rows.push(enrichViewModelBookMax(record, vm));
        partnerViews.push(summarizeSeatDeskPartnerView(record));
      } catch {
        /* skip malformed intake file */
      }
    }
  } catch {
    /* intake dir missing — empty snapshot */
  }

  rows.sort((a, b) => a.callSign.localeCompare(b.callSign));
  partnerViews.sort((a, b) => a.callSign.localeCompare(b.callSign));

  return {
    schema: 'factorywager.seat-capital-desk.v1',
    generatedAt: new Date().toISOString(),
    desks: rows.length,
    blocked: rows.filter(r => r.fundStatus === 'blocked').length,
    partial: rows.filter(r => r.fundStatus === 'partial').length,
    ready: rows.filter(r => r.fundStatus === 'ready').length,
    funded: rows.filter(r => r.fundStatus === 'funded').length,
    incompleteOuts: rows.reduce((sum, r) => sum + r.incompleteOuts, 0),
    rows,
    partnerViews,
    partnerMessageTemplates: Object.values(SEAT_DESK_PARTNER_MESSAGE_TEMPLATES),
    commands: SEAT_CAPITAL_DESK_COMMANDS,
  };
}

export function snapshotToSummarySlice(
  snap: SeatCapitalDeskSnapshot | null
): SeatCapitalDeskSummarySlice {
  if (!snap) return emptySeatCapitalDeskSummarySlice();
  return {
    available: true,
    path: SEAT_CAPITAL_DESK_REGISTRY_PATH,
    generatedAt: snap.generatedAt,
    desks: snap.desks,
    blocked: snap.blocked,
    partial: snap.partial,
    ready: snap.ready,
    funded: snap.funded,
    incompleteOuts: snap.incompleteOuts,
    rows: snap.rows,
    partnerViews: snap.partnerViews ?? [],
    partnerMessageTemplates:
      snap.partnerMessageTemplates ?? Object.values(SEAT_DESK_PARTNER_MESSAGE_TEMPLATES),
    commands: snap.commands,
  };
}

export function loadSeatCapitalDeskSummarySlice(
  absPath: string = SEAT_CAPITAL_DESK_REGISTRY_REL
): SeatCapitalDeskSummarySlice {
  try {
    const mapped = Bun.mmap(absPath);
    const snap = JSON.parse(new TextDecoder().decode(mapped)) as SeatCapitalDeskSnapshot;
    if (snap.schema !== 'factorywager.seat-capital-desk.v1') {
      return emptySeatCapitalDeskSummarySlice();
    }
    return snapshotToSummarySlice(snap);
  } catch {
    return emptySeatCapitalDeskSummarySlice();
  }
}

/** Write `public/registry/seat-capital-desk.json` under `root` (SSOT bake). */
export async function exportSeatCapitalDeskSnapshot(
  root: string = process.cwd()
): Promise<SeatCapitalDeskSummarySlice> {
  const rel = SEAT_CAPITAL_DESK_REGISTRY_REL;
  const abs = root.endsWith('/') ? `${root}${rel}` : `${root}/${rel}`;
  const intakeDir = root.endsWith('/') ? `${root}${SEAT_INTAKE_DIR}` : `${root}/${SEAT_INTAKE_DIR}`;

  const snap = await buildSeatCapitalDeskSnapshot(intakeDir);
  const slice = snapshotToSummarySlice(snap);

  const dir = abs.slice(0, abs.lastIndexOf('/'));
  if (dir) await Bun.$`mkdir -p ${dir}`.quiet();
  await Bun.write(abs, `${JSON.stringify(snap, null, 2)}\n`);

  return slice;
}
