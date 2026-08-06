// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Partners-ops registry **facade** — disk/SQLite I/O + compose projection.
 *
 * Pure projection / classifiers / validation: `partner-ops-project.ts`.
 * This module loads seat desk, handshake, taxonomy, events, ledger, forum meta,
 * then calls `projectPartnersOpsRegistry` and optionally writes the bake.
 *
 * @see ./partner-ops-project.ts
 * @see docs/harness/tenants/seat-capital-desk.md
 */
import type { Database } from 'bun:sqlite';
import type { PartnerOpsEvent } from './partner-ops-events.ts';
import { isPartnerOpsEventCode } from './partner-ops-events.ts';
import {
  PACKAGE_GROUP_FORUMS_META_DIR,
  loadPackageGroupForumMetadata,
} from './package-group-forum.ts';
import { joinPath } from '../path-bun';
import { openOperationsDb } from '../operations/db';
import { ledgerBalance, listLedgerEntries } from '../partner-profile/ledger';
import {
  PARTNERS_OPS_EVENTS_REL,
  PARTNERS_OPS_REGISTRY_REL,
  projectPartnersOpsRegistry,
  type PartnerLedgerOutSnapshot,
  type PartnerLedgerSnapshot,
  type PartnersOpsRegistry,
  type SeatDeskRow,
  type HandshakeRow,
} from './partner-ops-project.ts';

// Re-export public surface so existing import paths stay stable
export {
  PARTNERS_OPS_SCHEMA,
  PARTNERS_OPS_REGISTRY_REL,
  PARTNERS_OPS_REGISTRY_PATH,
  PARTNERS_OPS_EVENTS_REL,
  parseBookType,
  bookTypeWire,
  classifyBookType,
  classifyDepositMethod,
  classifyOutStatus,
  mapHandshakePhase,
  validatePartnersOpsRegistry,
  projectPartnersOpsRegistry,
  type PartnerOpsPhase,
  type BookType,
  type BookTypeWire,
  type DepositMethodKey,
  type OutStatusKey,
  type PartnersOpsValidationIssue,
  type PartnersOpsBook,
  type PartnersOpsOut,
  type PartnersOpsPartner,
  type PartnerLedgerSnapshot,
  type PartnerLedgerOutSnapshot,
  type PartnersOpsRegistry,
  type PartnersOpsProjectSources,
  type SeatOutRow,
  type SeatDeskRow,
  type HandshakeRow,
  type BookRegistryRow,
} from './partner-ops-project.ts';

export async function loadPartnerOpsEvents(root = process.cwd()): Promise<PartnerOpsEvent[]> {
  const abs = root.endsWith('/')
    ? `${root}${PARTNERS_OPS_EVENTS_REL}`
    : `${root}/${PARTNERS_OPS_EVENTS_REL}`;
  try {
    const text = await Bun.file(abs).text();
    const events: PartnerOpsEvent[] = [];
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (!t) continue;
      try {
        const row = JSON.parse(t) as PartnerOpsEvent;
        if (row && isPartnerOpsEventCode(String(row.code))) events.push(row);
      } catch {
        /* skip bad line */
      }
    }
    return events;
  } catch {
    return [];
  }
}

export async function appendPartnerOpsEvent(
  event: PartnerOpsEvent,
  root = process.cwd()
): Promise<string> {
  const abs = root.endsWith('/')
    ? `${root}${PARTNERS_OPS_EVENTS_REL}`
    : `${root}/${PARTNERS_OPS_EVENTS_REL}`;
  const dir = abs.slice(0, abs.lastIndexOf('/'));
  if (dir) await Bun.$`mkdir -p ${dir}`.quiet();
  const file = Bun.file(abs);
  const prev = (await file.exists()) ? await file.text() : '';
  await Bun.write(abs, `${prev}${JSON.stringify(event)}\n`);
  return abs;
}

/**
 * Read SQLite `partner_ledger` snapshots from the ops DB (keyed by partner
 * CODE, uppercased). Gracefully returns an empty map when the DB file or the
 * table is absent — the public build runs without local ops data.
 */
export async function loadSqliteLedgerSnapshots(
  root = process.cwd()
): Promise<Map<string, PartnerLedgerSnapshot>> {
  const dbPath = joinPath(root, 'data', 'operations.db');
  if (!(await Bun.file(dbPath).exists())) return new Map();
  let db: Database;
  try {
    db = openOperationsDb({ path: dbPath });
  } catch {
    return new Map();
  }
  try {
    const tables = db
      .query(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'partner_ledger'`)
      .all();
    if (tables.length === 0) return new Map();
    const codes = (
      db.query('SELECT DISTINCT partner_code FROM partner_ledger').all() as {
        partner_code: string;
      }[]
    ).map(r => r.partner_code.toUpperCase());
    const out = new Map<string, PartnerLedgerSnapshot>();
    for (const code of codes) {
      const entries = listLedgerEntries(db, code);
      if (entries.length === 0) continue;
      const initial = entries.find(e => e.type === 'initial_capital');
      const outs: Record<string, PartnerLedgerOutSnapshot> = {};
      for (const entry of entries) {
        if (!entry.bookKey) continue;
        const prev = outs[entry.bookKey] ?? { balance: 0 };
        outs[entry.bookKey] = {
          balance: prev.balance + entry.amount,
          lastTransactionAt: entry.createdAt,
          lastAmount: entry.amount,
          lastType: entry.type,
        };
      }
      out.set(code, {
        balance: ledgerBalance(db, code),
        initialCapital: initial?.amount ?? 0,
        rows: entries.length,
        lastEventAt: entries[entries.length - 1]!.createdAt,
        recentRows: entries.slice(-25),
        outs,
      });
    }
    return out;
  } finally {
    db.close();
  }
}

/** Load disk sources + project partners-ops v2 registry. */
export async function buildPartnersOpsRegistry(root = process.cwd()): Promise<PartnersOpsRegistry> {
  const seatPath = root.endsWith('/')
    ? `${root}public/registry/seat-capital-desk.json`
    : `${root}/public/registry/seat-capital-desk.json`;
  const handshakePath = root.endsWith('/')
    ? `${root}public/registry/telegram-handshake.json`
    : `${root}/public/registry/telegram-handshake.json`;
  const taxonomyPath = root.endsWith('/')
    ? `${root}public/registry/scrape-wire-taxonomy.json`
    : `${root}/public/registry/scrape-wire-taxonomy.json`;

  const [seat, handshake, taxonomy, events] = await Promise.all([
    Bun.file(seatPath)
      .json()
      .catch(() => ({ rows: [] as SeatDeskRow[] })),
    Bun.file(handshakePath)
      .json()
      .catch(() => ({ rows: [] as HandshakeRow[] })),
    Bun.file(taxonomyPath)
      .json()
      .catch(() => ({ bookRegistry: [] })),
    loadPartnerOpsEvents(root),
  ]);

  const seatRows = (seat.rows || []) as SeatDeskRow[];
  const handshakeRows = (handshake.rows || []) as HandshakeRow[];
  const ledgerSnapshots = await loadSqliteLedgerSnapshots(root);

  const forumByCode = new Map<
    string,
    {
      chatId?: string | number | null;
      topicsThreadMap?: Record<string, number | null | undefined>;
    }
  >();
  const codes = new Set<string>();
  for (const row of seatRows) {
    const code = String(row.partnerCode || '').toUpperCase();
    if (code) codes.add(code);
  }
  await Promise.all(
    [...codes].map(async code => {
      const forumMeta = await loadPackageGroupForumMetadata(code, {
        rootDir: PACKAGE_GROUP_FORUMS_META_DIR,
      });
      if (forumMeta) {
        forumByCode.set(code, {
          chatId: forumMeta.chatId,
          topicsThreadMap: forumMeta.topicsThreadMap,
        });
      }
    })
  );

  return projectPartnersOpsRegistry({
    seatRows,
    handshakeRows,
    taxonomy,
    events,
    ledgerSnapshots,
    forumByCode,
  });
}

export async function exportPartnersOpsRegistry(
  root = process.cwd(),
  outputRoot = root
): Promise<PartnersOpsRegistry> {
  const registry = await buildPartnersOpsRegistry(root);
  const abs = outputRoot.endsWith('/')
    ? `${outputRoot}${PARTNERS_OPS_REGISTRY_REL}`
    : `${outputRoot}/${PARTNERS_OPS_REGISTRY_REL}`;
  const dir = abs.slice(0, abs.lastIndexOf('/'));
  if (dir) await Bun.$`mkdir -p ${dir}`.quiet();
  await Bun.write(abs, `${JSON.stringify(registry, null, 2)}\n`);
  return registry;
}
