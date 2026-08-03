// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Partners-ops registry v2 — collision-free projection over seat-capital-desk + handshake.
 *
 * Soft ledger mutations stay in toc-ops-repo `ct`. This bake is the factory mirror:
 * identities, book/rail taxonomy, freeplay aggregates, glossary/color wiring.
 *
 * @see docs/harness/tenants/seat-capital-desk.md
 * @see lib/telegram/partner-ops-glossary.ts
 */
import type { Database } from 'bun:sqlite';
import { partnerOpsColorMap, partnerOpsConceptColorWire } from './partner-ops-color-kernel.ts';
import {
  PARTNER_OPS_EVENT_CODES,
  PARTNER_OPS_EVENT_GLOSSARY,
  type PartnerOpsEvent,
  type PartnerOpsEventCode,
  isPartnerOpsEventCode,
} from './partner-ops-events.ts';
import { PARTNER_OPS_GLOSSARY_CONCEPT_IDS } from './partner-ops-glossary.ts';
import { TELEGRAM_GLOSSARY_CONCEPT_IDS } from './handshake-catalog.ts';
import {
  buildPerAccountAccountingView,
  validateOpsAccountingViewShape,
} from './ops-accounting-view.ts';
import { OPS_VIEW_MVP_CONCEPT_IDS } from './ops-view-glossary.ts';
import {
  PACKAGE_GROUP_FORUMS_META_DIR,
  loadPackageGroupForumMetadata,
} from './package-group-forum.ts';
import { joinPath } from '../path-bun';
import { openOperationsDb } from '../operations/db';
import { ledgerBalance, listLedgerEntries } from '../partner-profile/ledger';

export const PARTNERS_OPS_SCHEMA = 'factorywager.partners-ops.v2' as const;
export const PARTNERS_OPS_REGISTRY_REL = 'public/registry/partners-ops.json';
export const PARTNERS_OPS_REGISTRY_PATH = '/registry/partners-ops.json' as const;
export const PARTNERS_OPS_EVENTS_REL = 'reports/telegram/partners-events.jsonl';

const PARTNER_CODE_RE = /^[A-Z]{3,6}$/;
const CALL_SIGN_RE = /^[A-Z]{3,6}-\d{3}(?:-SUB\d{2}){0,2}$/;

const LEGAL_BOOK_SLUGS = new Set([
  'draftkings',
  'fanduel',
  'betmgm',
  'caesars',
  'espnbet',
  'fanatics',
  'hardrock',
  'bet365',
  'betrivers',
  'circa',
]);

export type PartnerOpsPhase = 'operator_ready' | 'onboarding' | 'incomplete' | 'paused';

/** Canonical book class (registry + `book.type.${BookType}`). */
export type BookType = 'legal' | 'offshore' | 'pph' | 'crypto' | 'sweepstakes' | 'exchange';

/**
 * Preferred wire / UI tokens. `legal-us` is the public alias for registry `legal`
 * (`book.type.legal`); typo `crpyto` normalizes to `crypto`.
 */
export type BookTypeWire =
  | 'crypto'
  | 'pph'
  | 'legal-us'
  | 'sweepstakes'
  | 'exchange'
  | 'offshore'
  | 'legal';
export type DepositMethodKey =
  | 'venmo'
  | 'crypto'
  | 'wire'
  | 'credit'
  | 'cashapp'
  | 'paypal'
  | 'zelle'
  | 'apple_pay'
  | 'unknown';
export type OutStatusKey = 'ready' | 'deferred' | 'paused' | 'blocked' | 'partial' | 'funded';

export type PartnersOpsValidationIssue = {
  level: 'error' | 'warn';
  code: string; // brand-ok — validation issue code
  message: string;
};

export type PartnersOpsBook = {
  id: string; // brand-ok — book-{slug}
  slug: string;
  name: string;
  type: BookType;
  typeConceptId: `book.type.${BookType}`;
  color: ReturnType<typeof partnerOpsConceptColorWire>;
  scrapeHex?: string;
};

export type PartnersOpsOut = {
  id: string; // brand-ok — out token
  book: PartnersOpsBook;
  credentials: { username: string };
  funding: {
    method: DepositMethodKey;
    methodConceptId: `deposit.method.${DepositMethodKey}`;
    target: string;
    railId: string; // brand-ok — rail-{method}-{target}
    color: ReturnType<typeof partnerOpsConceptColorWire>;
  };
  maxBet: string;
  freeRollPercent: number | null;
  status: OutStatusKey;
  statusConceptId: `out.status.${OutStatusKey}`;
  statusColor: ReturnType<typeof partnerOpsConceptColorWire>;
  incomplete: boolean;
  note: string;
};

export type PartnersOpsPartner = {
  code: string; // brand-ok — partner CODE
  callSign: string; // brand-ok — call sign
  phase: PartnerOpsPhase;
  phaseConceptId: `partner.phase.${PartnerOpsPhase}`;
  phaseColor: ReturnType<typeof partnerOpsConceptColorWire>;
  telegram: {
    chatId: string | null; // brand-ok — telegram chat id wire
    topicIds: Record<string, number | null>;
  };
  outs: PartnersOpsOut[];
  accounting: {
    fundStatus: string;
    incompleteOuts: number;
    deposits: { amount: number; date: string; rail: string }[];
    credits: { amount: number; date: string }[];
    freeRoll: { total: number; used: number };
    ledger: PartnerOpsEvent[];
    /** SQLite partner_ledger projection (present only when the ops DB has rows). */
    balance?: number;
    initialCapital?: number;
    sqlLedgerCount?: number;
  };
  tracking: {
    accounts: {
      total: number;
      ready: number;
      deferred: number;
      blocked: number;
    };
    limits: {
      tracked: number;
      missing: number;
      coveragePct: number;
    };
    communication: {
      chatLinked: boolean;
      topicsConfigured: number;
      topicsRequired: number;
      ready: boolean;
    };
    accounting: {
      depositVolume: number;
      creditVolume: number;
      ledgerEvents: number;
      freeRollPercent: number;
      freeRollApplied: number;
      /** Current running balance from the SQLite partner_ledger (when present). */
      balance?: number;
    };
  };
};

/** SQLite `partner_ledger` projection for one partner (from the ops DB). */
export interface PartnerLedgerSnapshot {
  balance: number;
  initialCapital: number;
  rows: number;
  lastEventAt?: string;
}

export type PartnersOpsRegistry = {
  schema: typeof PARTNERS_OPS_SCHEMA;
  version: '2';
  generatedAt: string;
  path: typeof PARTNERS_OPS_REGISTRY_PATH;
  sources: {
    seatCapitalDesk: '/registry/seat-capital-desk.json';
    handshake: '/registry/telegram-handshake.json';
    scrapeWireTaxonomy: '/registry/scrape-wire-taxonomy.json';
    limitPatterns: '/registry/limit-raises.json';
    events: typeof PARTNERS_OPS_EVENTS_REL;
  };
  glossary: {
    path: '/portal/glossary/';
    boardPath: '/portal/partners/';
    conceptIds: readonly string[];
  };
  colors: ReturnType<typeof partnerOpsColorMap>;
  eventCodes: readonly PartnerOpsEventCode[];
  books: PartnersOpsBook[];
  partners: PartnersOpsPartner[];
  summary: {
    partners: number;
    outs: number;
    books: number;
    accounts: number;
    readyAccounts: number;
    trackedLimits: number;
    communicationReady: number;
    ledgerEvents: number;
    incompleteOuts: number;
    validationErrors: number;
    validationWarnings: number;
    /** Sum of SQLite partner_ledger balances (present when the ops DB has rows). */
    accountingBalance?: number;
  };
  validation: {
    ok: boolean;
    issues: PartnersOpsValidationIssue[];
  };
};

type SeatOutRow = {
  outNum?: string;
  book?: string;
  username?: string;
  depositMethod?: string;
  sendTo?: string;
  maxBet?: string;
  freeplayPct?: string;
  status?: string;
  incomplete?: boolean;
  note?: string;
};

type SeatDeskRow = {
  callSign?: string;
  partnerCode?: string;
  fundStatus?: string;
  outs?: SeatOutRow[];
  incompleteOuts?: number;
};

type HandshakeRow = {
  partnerCode?: string;
  callSign?: string;
  phase?: string;
  chatId?: string | number | null; // brand-ok — Telegram chat id wire from handshake bake
  topicsThreadMap?: Record<string, number | null | undefined>;
};

type BookRegistryRow = {
  id?: string; // brand-ok — scrape-wire book registry key
  key?: string;
  label?: string;
  aliases?: string[];
  hex?: string;
  css?: string;
};

function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function parseFreeRollPercent(raw: string | undefined): number | null {
  if (!raw || raw === '—') return null;
  const m = String(raw).match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function hasTrackedLimit(raw: string): boolean {
  const value = raw.trim().toLowerCase();
  return value !== '' && value !== '—' && value !== '-' && value !== 'tbd' && value !== 'unknown';
}

/** Normalize wire tokens (`legal-us`, typo `crpyto`) onto registry BookType. */
export function parseBookType(raw: string | undefined | null): BookType | undefined {
  const key = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replaceAll('_', '-');
  if (!key) return undefined;
  if (key === 'legal-us' || key === 'legal' || key === 'us-legal') return 'legal';
  if (key === 'crypto' || key === 'crpyto') return 'crypto';
  if (key === 'pph' || key === 'pay-per-head') return 'pph';
  if (key === 'sweepstakes' || key === 'sweepstake' || key === 'sweeps') return 'sweepstakes';
  if (key === 'exchange' || key === 'betting-exchange') return 'exchange';
  if (key === 'offshore') return 'offshore';
  return undefined;
}

/** Public wire token for a registry BookType (`legal` → `legal-us`). */
export function bookTypeWire(type: BookType): BookTypeWire {
  return type === 'legal' ? 'legal-us' : type;
}

export function classifyBookType(name: string, scrapeIds: Set<string>): BookType {
  const lower = name.toLowerCase();
  if (/\b(crypto|bitcoin|btc|usdc|coin)\b/.test(lower)) return 'crypto';
  if (/\b(pph|pay[\s-]?per[\s-]?head|agent desk)\b/.test(lower)) return 'pph';
  if (
    /\b(exchange|matched\s*bet|p2p\s*book)\b/.test(lower) ||
    /\b(betfair|smarkets|matchbook|kalshi|polymarket)\b/.test(lower)
  ) {
    return 'exchange';
  }
  if (
    /\b(sweepstakes?|sweeps|social\s*casino|playthrough|gold\s*coins?|sc\b)\b/.test(lower) ||
    /\b(fliff|dabble|underdog|prizepicks|sleeper|yahoo\s*sports)\b/.test(lower)
  ) {
    return 'sweepstakes';
  }
  const slug = slugify(name).replace(/-/g, '');
  for (const id of scrapeIds) {
    if (slug.includes(id) || id.includes(slug.slice(0, 8))) return 'legal';
  }
  if (
    /hard\s*rock|draftkings|fanduel|betmgm|caesars|fanatics|espn\s*bet|betrivers|circa|bet365/.test(
      lower
    )
  ) {
    return 'legal';
  }
  return 'offshore';
}

export function classifyDepositMethod(raw: string | undefined): DepositMethodKey {
  const t = (raw || '').trim().toLowerCase();
  if (!t || t === '—') return 'unknown';
  if (/venmo/.test(t)) return 'venmo';
  if (/cash\s*app|cashapp/.test(t)) return 'cashapp';
  if (/paypal/.test(t)) return 'paypal';
  if (/zelle/.test(t)) return 'zelle';
  if (/apple\s*pay/.test(t)) return 'apple_pay';
  if (/wire|ach|bank/.test(t)) return 'wire';
  if (/credit|house credit/.test(t)) return 'credit';
  if (/crypto|btc|usdc|eth|coin/.test(t)) return 'crypto';
  return 'unknown';
}

export function classifyOutStatus(raw: string | undefined): OutStatusKey {
  const t = (raw || '').trim().toLowerCase();
  if (t === 'deferred' || t === 'defered') return 'deferred';
  if (t === 'paused') return 'paused';
  if (t === 'blocked') return 'blocked';
  if (t === 'partial') return 'partial';
  if (t === 'funded') return 'funded';
  return 'ready';
}

export function mapHandshakePhase(phase: string | undefined, fundStatus?: string): PartnerOpsPhase {
  const p = (phase || '').toLowerCase();
  if (p === 'paused' || fundStatus === 'paused') return 'paused';
  if (p === 'operator_ready') return 'operator_ready';
  if (p === 'forum_ready' || p === 'designated' || p === 'onboarding') return 'onboarding';
  if (p === 'blocked' || p === 'incomplete') return 'incomplete';
  if (fundStatus === 'blocked') return 'incomplete';
  if (fundStatus === 'ready' || fundStatus === 'funded') return 'operator_ready';
  return 'onboarding';
}

function railId(method: DepositMethodKey, target: string): string {
  const t = slugify(target || 'unset') || 'unset';
  return `rail-${method}-${t}`;
}

function bookId(name: string): string {
  const slug = slugify(name) || 'unknown';
  return `book-${slug}`;
}

function outId(partnerCode: string, outNum: string | undefined, index: number): string {
  const n = outNum && /^\d+$/.test(outNum) ? outNum : String(index + 1);
  return `out-${partnerCode}-${n}`;
}

function indexBooks(taxonomy: { bookRegistry?: BookRegistryRow[] } | null) {
  const byNorm = new Map<string, BookRegistryRow>();
  const scrapeIds = new Set<string>([...LEGAL_BOOK_SLUGS]);
  for (const book of taxonomy?.bookRegistry || []) {
    if (book.id) scrapeIds.add(String(book.id).toLowerCase());
    if (book.key) scrapeIds.add(String(book.key).toLowerCase());
    for (const key of [book.id, book.key, book.label, ...(book.aliases || [])]) {
      const norm = String(key || '')
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, '');
      if (norm) byNorm.set(norm, book);
    }
  }
  return { byNorm, scrapeIds };
}

function resolveBook(
  name: string,
  index: ReturnType<typeof indexBooks>,
  cache: Map<string, PartnersOpsBook>
): PartnersOpsBook {
  const label = name?.trim() || 'Unknown book';
  const id = bookId(label);
  const hit = cache.get(id);
  if (hit) return hit;
  const norm = label.toLowerCase().replace(/[\s_-]+/g, '');
  const scrape = index.byNorm.get(norm);
  const type = classifyBookType(label, index.scrapeIds);
  const typeConceptId = `book.type.${type}` as const;
  const book: PartnersOpsBook = {
    id,
    slug: slugify(label) || 'unknown',
    name: scrape?.label || label,
    type,
    typeConceptId,
    color: partnerOpsConceptColorWire(typeConceptId),
    scrapeHex: scrape?.hex || scrape?.css,
  };
  cache.set(id, book);
  return book;
}

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

export function validatePartnersOpsRegistry(
  partners: readonly PartnersOpsPartner[],
  knownGlossaryIds: ReadonlySet<string>
): PartnersOpsValidationIssue[] {
  const issues: PartnersOpsValidationIssue[] = [];
  const codes = new Set<string>();
  const callSigns = new Set<string>();
  const outIds = new Set<string>();
  const railTargets = new Map<string, string>(); // target → partner

  for (const p of partners) {
    if (!PARTNER_CODE_RE.test(p.code)) {
      issues.push({
        level: 'error',
        code: 'partner_code_shape',
        message: `Invalid partner code "${p.code}" (expect 3–6 A–Z)`,
      });
    }
    if (codes.has(p.code)) {
      issues.push({
        level: 'error',
        code: 'partner_code_dup',
        message: `Duplicate partner code ${p.code}`,
      });
    }
    codes.add(p.code);

    if (!CALL_SIGN_RE.test(p.callSign)) {
      issues.push({
        level: 'error',
        code: 'call_sign_shape',
        message: `Invalid call sign "${p.callSign}"`,
      });
    }
    if (callSigns.has(p.callSign)) {
      issues.push({
        level: 'error',
        code: 'call_sign_dup',
        message: `Duplicate call sign ${p.callSign}`,
      });
    }
    callSigns.add(p.callSign);

    const incompleteFlags = p.outs.filter(o => o.incomplete).length;
    if (p.accounting.incompleteOuts !== incompleteFlags) {
      issues.push({
        level: 'warn',
        code: 'incomplete_outs_mismatch',
        message: `${p.code}: incompleteOuts=${p.accounting.incompleteOuts} but incomplete flags=${incompleteFlags}`,
      });
    }

    for (const conceptId of [
      p.phaseConceptId,
      ...p.outs.map(o => o.statusConceptId),
      ...p.outs.map(o => o.book.typeConceptId),
      ...p.outs.map(o => o.funding.methodConceptId),
    ]) {
      if (!knownGlossaryIds.has(conceptId)) {
        issues.push({
          level: 'error',
          code: 'glossary_missing',
          message: `${p.code}: concept ${conceptId} missing from glossary`,
        });
      }
    }

    for (const out of p.outs) {
      if (outIds.has(out.id)) {
        issues.push({
          level: 'error',
          code: 'out_id_dup',
          message: `Duplicate out id ${out.id}`,
        });
      }
      outIds.add(out.id);

      const target = out.funding.target.trim();
      if (target && target !== '—') {
        const prior = railTargets.get(target.toLowerCase());
        if (prior && prior !== p.code) {
          issues.push({
            level: 'warn',
            code: 'funding_target_shared',
            message: `Funding target "${target}" used by ${prior} and ${p.code}`,
          });
        } else {
          railTargets.set(target.toLowerCase(), p.code);
        }
      }
    }

    // Per-account AccountingView (ops.view.*) — Soft Balance stays in toc-ops `ct`.
    const accountingView = buildPerAccountAccountingView(p);
    if (!accountingView) {
      issues.push({
        level: 'error',
        code: 'accounting_view_missing',
        message: `${p.code}: per-account AccountingView failed (partner CODE required)`,
      });
    } else {
      for (const shapeIssue of validateOpsAccountingViewShape(accountingView)) {
        issues.push({
          level: 'error',
          code: `accounting_view_${shapeIssue.code}`,
          message: `${p.code}: ${shapeIssue.message}`,
        });
      }
      if (accountingView.partnerCode !== p.code) {
        issues.push({
          level: 'error',
          code: 'accounting_view_shape',
          message: `${p.code}: AccountingView partnerCode mismatch`,
        });
      }
      for (const conceptId of Object.values(accountingView.conceptIds)) {
        if (!knownGlossaryIds.has(conceptId)) {
          issues.push({
            level: 'error',
            code: 'accounting_view_glossary',
            message: `${p.code}: AccountingView concept ${conceptId} missing from glossary inventory`,
          });
        }
      }
    }
  }

  for (const code of PARTNER_OPS_EVENT_CODES) {
    const conceptId = PARTNER_OPS_EVENT_GLOSSARY[code];
    if (!knownGlossaryIds.has(conceptId) && conceptId !== 'telegram.wire') {
      issues.push({
        level: 'error',
        code: 'event_glossary_missing',
        message: `Event ${code} maps to missing concept ${conceptId}`,
      });
    }
  }

  return issues;
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
      out.set(code, {
        balance: ledgerBalance(db, code),
        initialCapital: initial?.amount ?? 0,
        rows: entries.length,
        lastEventAt: entries[entries.length - 1]!.createdAt,
      });
    }
    return out;
  } finally {
    db.close();
  }
}

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
      .catch(() => ({ rows: [] })),
    Bun.file(handshakePath)
      .json()
      .catch(() => ({ rows: [] })),
    Bun.file(taxonomyPath)
      .json()
      .catch(() => ({ bookRegistry: [] })),
    loadPartnerOpsEvents(root),
  ]);

  const bookIndex = indexBooks(taxonomy);
  const bookCache = new Map<string, PartnersOpsBook>();
  const hsByCode = new Map<string, HandshakeRow>();
  for (const row of handshake.rows || []) {
    const code = String(row.partnerCode || '').toUpperCase();
    if (code) hsByCode.set(code, row);
  }

  const eventsByPartner = new Map<string, PartnerOpsEvent[]>();
  for (const ev of events) {
    const code = String(ev.partnerCode || '').toUpperCase();
    if (!code) continue;
    const list = eventsByPartner.get(code) ?? [];
    list.push(ev);
    eventsByPartner.set(code, list);
  }

  const ledgerSnapshots = await loadSqliteLedgerSnapshots(root);

  const partners: PartnersOpsPartner[] = [];
  for (const row of (seat.rows || []) as SeatDeskRow[]) {
    const code = String(row.partnerCode || '').toUpperCase();
    const callSign = String(row.callSign || '').toUpperCase();
    if (!code || !callSign) continue;
    const hs = hsByCode.get(code);
    const snap = ledgerSnapshots.get(code);
    const phase = mapHandshakePhase(hs?.phase, row.fundStatus);
    const phaseConceptId = `partner.phase.${phase}` as const;
    // Handshake bake omits chatId / topicsThreadMap — load forum metadata SSOT.
    const forumMeta = await loadPackageGroupForumMetadata(code, {
      rootDir: PACKAGE_GROUP_FORUMS_META_DIR,
    });
    const topicMap = forumMeta?.topicsThreadMap || hs?.topicsThreadMap || {};
    const partnerEvents = (eventsByPartner.get(code) ?? []).slice(-50);
    const deposits = partnerEvents
      .filter(e => e.code === 'DEPOSIT_RECEIVED' || e.code === 'DEPOSIT_ALLOCATED')
      .map(e => ({
        amount: e.amount ?? 0,
        date: (e.at || '').slice(0, 10),
        rail: e.rail || 'unknown',
      }));
    const credits = partnerEvents
      .filter(e => e.code === 'CREDIT_EXTENDED')
      .map(e => ({ amount: e.amount ?? 0, date: (e.at || '').slice(0, 10) }));
    const freeRollApplied = partnerEvents.filter(e => e.code === 'FREE_ROLL_APPLIED');
    const outs: PartnersOpsOut[] = (row.outs || []).map((out, i) => {
      const book = resolveBook(String(out.book || 'Unknown'), bookIndex, bookCache);
      const method = classifyDepositMethod(out.depositMethod);
      const methodConceptId = `deposit.method.${method}` as const;
      const status = classifyOutStatus(out.status);
      const statusConceptId = `out.status.${status}` as const;
      const target = String(out.sendTo || '—');
      return {
        id: outId(code, out.outNum, i),
        book,
        credentials: { username: String(out.username || '—') },
        funding: {
          method,
          methodConceptId,
          target,
          railId: railId(method, target),
          color: partnerOpsConceptColorWire(methodConceptId),
        },
        maxBet: String(out.maxBet || '—'),
        freeRollPercent: parseFreeRollPercent(out.freeplayPct),
        status,
        statusConceptId,
        statusColor: partnerOpsConceptColorWire(statusConceptId),
        incomplete: Boolean(out.incomplete),
        note: String(out.note || ''),
      };
    });

    const topicIds = {
      general: topicMap.general ?? null,
      ops: topicMap.ops ?? null,
      alerts: topicMap.alerts ?? null,
      liquidity: topicMap['liquidity/outs'] ?? topicMap.liquidity ?? null,
      accounting: topicMap.accounting ?? null,
    };
    const chatId =
      forumMeta?.chatId != null
        ? String(forumMeta.chatId)
        : hs?.chatId != null
          ? String(hs.chatId)
          : null;
    const freeRollPercents = outs
      .map(o => o.freeRollPercent)
      .filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
    // Mean of per-out free-roll percents (not a sum — multi-out partners must not inflate %).
    const freeRollMean =
      freeRollPercents.length === 0
        ? 0
        : freeRollPercents.reduce((s, n) => s + n, 0) / freeRollPercents.length;
    const accounting = {
      fundStatus: String(row.fundStatus || 'unknown'),
      incompleteOuts: Number(row.incompleteOuts ?? outs.filter(o => o.incomplete).length),
      deposits,
      credits,
      freeRoll: {
        total: freeRollMean,
        used: freeRollApplied.length,
      },
      ledger: partnerEvents,
      ...(snap
        ? { balance: snap.balance, initialCapital: snap.initialCapital, sqlLedgerCount: snap.rows }
        : {}),
    };
    const readyAccounts = outs.filter(o => o.status === 'ready' || o.status === 'funded').length;
    const deferredAccounts = outs.filter(
      o => o.status === 'deferred' || o.status === 'partial'
    ).length;
    const blockedAccounts = outs.filter(
      o => o.status === 'blocked' || o.status === 'paused'
    ).length;
    const trackedLimits = outs.filter(o => hasTrackedLimit(o.maxBet)).length;
    const topicsConfigured = Object.values(topicIds).filter(value =>
      Number.isInteger(value)
    ).length;
    const topicsRequired = Object.keys(topicIds).length;

    partners.push({
      code,
      callSign,
      phase,
      phaseConceptId,
      phaseColor: partnerOpsConceptColorWire(phaseConceptId),
      telegram: {
        chatId,
        topicIds,
      },
      outs,
      accounting,
      tracking: {
        accounts: {
          total: outs.length,
          ready: readyAccounts,
          deferred: deferredAccounts,
          blocked: blockedAccounts,
        },
        limits: {
          tracked: trackedLimits,
          missing: Math.max(0, outs.length - trackedLimits),
          coveragePct: outs.length === 0 ? 0 : Math.round((trackedLimits / outs.length) * 100),
        },
        communication: {
          chatLinked: chatId !== null,
          topicsConfigured,
          topicsRequired,
          ready: chatId !== null && topicsConfigured === topicsRequired,
        },
        accounting: {
          depositVolume: deposits.reduce((sum, entry) => sum + entry.amount, 0),
          creditVolume: credits.reduce((sum, entry) => sum + entry.amount, 0),
          ledgerEvents: partnerEvents.length,
          freeRollPercent: accounting.freeRoll.total,
          freeRollApplied: accounting.freeRoll.used,
          ...(snap ? { balance: snap.balance } : {}),
        },
      },
    });
  }

  partners.sort((a, b) => a.code.localeCompare(b.code));

  const knownGlossaryIds = new Set<string>([
    ...PARTNER_OPS_GLOSSARY_CONCEPT_IDS,
    ...TELEGRAM_GLOSSARY_CONCEPT_IDS,
    ...OPS_VIEW_MVP_CONCEPT_IDS,
    'page.partners',
    'section.partnersTelegram',
    'section.partnersAccounting',
    'section.partnersAccountsLimits',
    'section.partnersDeposits',
    'section.partnersPartnerMessage',
    'scrape.book',
  ]);
  const issues = validatePartnersOpsRegistry(partners, knownGlossaryIds);
  const books = [...bookCache.values()].sort((a, b) => a.id.localeCompare(b.id));
  const incompleteOuts = partners.reduce((s, p) => s + p.accounting.incompleteOuts, 0);

  return {
    schema: PARTNERS_OPS_SCHEMA,
    version: '2',
    generatedAt: new Date().toISOString(),
    path: PARTNERS_OPS_REGISTRY_PATH,
    sources: {
      seatCapitalDesk: '/registry/seat-capital-desk.json',
      handshake: '/registry/telegram-handshake.json',
      scrapeWireTaxonomy: '/registry/scrape-wire-taxonomy.json',
      limitPatterns: '/registry/limit-raises.json',
      events: PARTNERS_OPS_EVENTS_REL,
    },
    glossary: {
      path: '/portal/glossary/',
      boardPath: '/portal/partners/',
      conceptIds: [
        ...PARTNER_OPS_GLOSSARY_CONCEPT_IDS,
        ...TELEGRAM_GLOSSARY_CONCEPT_IDS,
        ...OPS_VIEW_MVP_CONCEPT_IDS,
      ],
    },
    colors: partnerOpsColorMap(),
    eventCodes: [...PARTNER_OPS_EVENT_CODES],
    books,
    partners,
    summary: {
      partners: partners.length,
      outs: partners.reduce((s, p) => s + p.outs.length, 0),
      books: books.length,
      accounts: partners.reduce((sum, partner) => sum + partner.tracking.accounts.total, 0),
      readyAccounts: partners.reduce((sum, partner) => sum + partner.tracking.accounts.ready, 0),
      trackedLimits: partners.reduce((sum, partner) => sum + partner.tracking.limits.tracked, 0),
      communicationReady: partners.filter(partner => partner.tracking.communication.ready).length,
      ledgerEvents: partners.reduce(
        (sum, partner) => sum + partner.tracking.accounting.ledgerEvents,
        0
      ),
      incompleteOuts,
      validationErrors: issues.filter(i => i.level === 'error').length,
      validationWarnings: issues.filter(i => i.level === 'warn').length,
      ...(ledgerSnapshots.size > 0
        ? {
            accountingBalance: partners.reduce(
              (sum, partner) => sum + (partner.accounting.balance ?? 0),
              0
            ),
          }
        : {}),
    },
    validation: {
      ok: issues.every(i => i.level !== 'error'),
      issues,
    },
  };
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
