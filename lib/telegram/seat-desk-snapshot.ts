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
  normalizeSeatIntake,
  SEAT_INTAKE_DIR,
  type SeatDeskViewModel,
  type SeatIntakeRecord,
} from './seat-capital-desk.ts';

export const SEAT_CAPITAL_DESK_REGISTRY_REL = 'public/registry/seat-capital-desk.json';
export const SEAT_CAPITAL_DESK_REGISTRY_PATH = '/registry/seat-capital-desk.json' as const;

const SEAT_CAPITAL_DESK_COMMANDS = {
  refresh: 'bun run seat:desk:refresh',
  post: 'bun run seat:desk:post',
  update: 'bun run seat:desk:update',
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
    commands: SEAT_CAPITAL_DESK_COMMANDS,
  };
}

/**
 * Scan `*.json` intake files under `intakeDir` (default `SEAT_INTAKE_DIR`),
 * normalize + map each to the passwordless view model, sorted by callSign.
 */
export async function buildSeatCapitalDeskSnapshot(
  intakeDir: string = SEAT_INTAKE_DIR
): Promise<SeatCapitalDeskSnapshot> {
  const rows: SeatDeskViewModel[] = [];
  try {
    const glob = new Bun.Glob('*.json');
    for await (const rel of glob.scan(intakeDir)) {
      try {
        const raw = (await Bun.file(`${intakeDir}/${rel}`).json()) as SeatIntakeRecord;
        rows.push(buildSeatDeskViewModel(normalizeSeatIntake(raw)));
      } catch {
        /* skip malformed intake file */
      }
    }
  } catch {
    /* intake dir missing — empty snapshot */
  }

  rows.sort((a, b) => a.callSign.localeCompare(b.callSign));

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
