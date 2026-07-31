// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
/**
 * Partners-ops registry v2 — collision-free projection over seat-capital-desk + handshake.
 *
 * Soft ledger mutations stay in toc-ops-repo `ct`. This bake is the factory mirror:
 * identities, book/rail taxonomy, freeplay aggregates, glossary/color wiring.
 *
 * @see docs/harness/tenants/seat-capital-desk.md
 * @see lib/telegram/partner-ops-glossary.ts
 */
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

export type BookType = 'legal' | 'offshore' | 'pph' | 'crypto';
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
  };
};

export type PartnersOpsRegistry = {
  schema: typeof PARTNERS_OPS_SCHEMA;
  version: '2';
  generatedAt: string;
  path: typeof PARTNERS_OPS_REGISTRY_PATH;
  sources: {
    seatCapitalDesk: '/registry/seat-capital-desk.json';
    handshake: '/registry/telegram-handshake.json';
    scrapeWireTaxonomy: '/registry/scrape-wire-taxonomy.json';
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
    incompleteOuts: number;
    validationErrors: number;
    validationWarnings: number;
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

export function classifyBookType(name: string, scrapeIds: Set<string>): BookType {
  const lower = name.toLowerCase();
  if (/\b(crypto|bitcoin|btc|usdc|coin)\b/.test(lower)) return 'crypto';
  if (/\b(pph|pay[\s-]?per[\s-]?head|agent desk)\b/.test(lower)) return 'pph';
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

  const partners: PartnersOpsPartner[] = [];
  for (const row of (seat.rows || []) as SeatDeskRow[]) {
    const code = String(row.partnerCode || '').toUpperCase();
    const callSign = String(row.callSign || '').toUpperCase();
    if (!code || !callSign) continue;
    const hs = hsByCode.get(code);
    const phase = mapHandshakePhase(hs?.phase, row.fundStatus);
    const phaseConceptId = `partner.phase.${phase}` as const;
    const topicMap = hs?.topicsThreadMap || {};
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

    partners.push({
      code,
      callSign,
      phase,
      phaseConceptId,
      phaseColor: partnerOpsConceptColorWire(phaseConceptId),
      telegram: {
        chatId: hs?.chatId != null ? String(hs.chatId) : null,
        topicIds: {
          general: topicMap.general ?? null,
          ops: topicMap.ops ?? null,
          alerts: topicMap.alerts ?? null,
          liquidity: topicMap['liquidity/outs'] ?? topicMap.liquidity ?? null,
          accounting: topicMap.accounting ?? null,
        },
      },
      outs,
      accounting: {
        fundStatus: String(row.fundStatus || 'unknown'),
        incompleteOuts: Number(row.incompleteOuts ?? outs.filter(o => o.incomplete).length),
        deposits,
        credits,
        freeRoll: {
          total: outs.reduce((s, o) => s + (o.freeRollPercent ?? 0), 0),
          used: freeRollApplied.length,
        },
        ledger: partnerEvents,
      },
    });
  }

  partners.sort((a, b) => a.code.localeCompare(b.code));

  const knownGlossaryIds = new Set<string>([
    ...PARTNER_OPS_GLOSSARY_CONCEPT_IDS,
    ...TELEGRAM_GLOSSARY_CONCEPT_IDS,
    'page.partners',
    'section.partnersTelegram',
    'section.partnersAccounting',
    'section.partnersDeposits',
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
      events: PARTNERS_OPS_EVENTS_REL,
    },
    glossary: {
      path: '/portal/glossary/',
      boardPath: '/portal/partners/',
      conceptIds: [...PARTNER_OPS_GLOSSARY_CONCEPT_IDS, ...TELEGRAM_GLOSSARY_CONCEPT_IDS],
    },
    colors: partnerOpsColorMap(),
    eventCodes: [...PARTNER_OPS_EVENT_CODES],
    books,
    partners,
    summary: {
      partners: partners.length,
      outs: partners.reduce((s, p) => s + p.outs.length, 0),
      books: books.length,
      incompleteOuts,
      validationErrors: issues.filter(i => i.level === 'error').length,
      validationWarnings: issues.filter(i => i.level === 'warn').length,
    },
    validation: {
      ok: issues.every(i => i.level !== 'error'),
      issues,
    },
  };
}

export async function exportPartnersOpsRegistry(
  root = process.cwd()
): Promise<PartnersOpsRegistry> {
  const registry = await buildPartnersOpsRegistry(root);
  const abs = root.endsWith('/')
    ? `${root}${PARTNERS_OPS_REGISTRY_REL}`
    : `${root}/${PARTNERS_OPS_REGISTRY_REL}`;
  const dir = abs.slice(0, abs.lastIndexOf('/'));
  if (dir) await Bun.$`mkdir -p ${dir}`.quiet();
  await Bun.write(abs, `${JSON.stringify(registry, null, 2)}\n`);
  return registry;
}
