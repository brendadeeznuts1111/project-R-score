// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/hashing#bun-hash — Bun.hash
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/toml#bun-toml-stringify — Bun.TOML.stringify
import { joinPath } from '../../path-bun.ts';
import type { Database } from 'bun:sqlite';
import { tomlStringify } from '../../toml-stringify.ts';
import { ROOT } from '../paths.ts';
import { openOddsDb } from '../odds/odds-store.ts';
import { loadMergedRegistry } from '../../bookmakers/merge.ts';
import { sendPartnerSignal } from '../partners-signal.ts';
import { detectCrossBookArbitrage, type ArbitrageOpportunity } from './arbitrage.ts';
import { detectDelays } from './delay-detector.ts';
import { detectNotableMovements, type LineMovement } from './line-movement.ts';
import {
  enrichAlertPartnerFields,
  resolvePartnerContext,
  ruleMatchesPartners,
} from './partner-filters.ts';
import { ensureAlertsSchema } from './alerts-schema.ts';
import { detectSmartMoney, type SmartMoneySignal } from './smart-money.ts';

export { ensureAlertsSchema } from './alerts-schema.ts';

const ALERTS_TOML_PATH = joinPath(ROOT, 'config/operator-research/alerts.toml');

export type AlertType =
  | 'arbitrage'
  | 'movement'
  | 'delay'
  | 'smart_money'
  | 'new_event'
  | 'price_change'
  | 'limit_change';
export type AlertChannel = 'ws' | 'email' | 'telegram';
/** Odds period filter. `prematch` maps to DB session `pregame`. */
export type AlertPeriod = 'prematch' | 'live' | 'all';
export type AlertPattern = 'spike' | 'drift' | 'reversal' | 'arbitrage';

/** Event-monitor trigger kinds (also stored in data/research/alerts.json). */
export const EVENT_ALERT_TYPES = new Set<AlertType>(['new_event', 'price_change', 'limit_change']);

export function isEventAlertType(type: string | undefined): type is AlertType {
  return !!type && EVENT_ALERT_TYPES.has(type as AlertType);
}

export type AlertEdge = {
  /** Fraction (0.02 = 2%). */
  min: number;
  max?: number;
};

export type AlertLimit = {
  /** Stake bounds in USD. */
  min?: number;
  max?: number;
};

export type AlertRule = {
  id: string; // brand-ok — opaque research/wire id
  name?: string;
  description?: string;
  type: AlertType;
  threshold: number;
  enabled: boolean;
  condition?: string;
  channels: AlertChannel[];
  emailRecipients: string[];
  period: AlertPeriod;
  pattern?: AlertPattern;
  edge?: AlertEdge;
  /** moneyline | spread | total | all */
  marketType?: string;
  /** US | UK | EU | all */
  geo?: string;
  /** Optional jurisdiction filter, e.g. NV */
  state?: string;
  limit?: AlertLimit;
  /** Book feed latency threshold in ms */
  latencyThreshold?: number;
  /** e.g. fonbet_vs_betmgm */
  bookmakerComparison?: string;
  /** Canonical event id or `*` (event-monitor rules). */
  eventId?: string; // brand-ok — opaque research/wire id
  /** Partner filter for event-monitor rules. */
  partnerIds?: string[];
  /** Optional Telegram chat override for event-monitor / telegram channel. */
  telegramChatId?: string; // brand-ok — opaque research/wire id
  /** Source store — toml desk rules vs research event JSON. */
  source?: 'toml' | 'research';
};

export type AlertEvent = {
  id: string; // brand-ok — opaque research/wire id
  type: AlertType;
  ruleId: string; // brand-ok — opaque research/wire id
  severity: 'info' | 'warn' | 'critical';
  title: string;
  details: string;
  payload: unknown;
  createdAt: string;
  channels?: AlertChannel[];
};

const METRIC_TO_TYPE: Record<string, AlertType> = {
  arb_percent: 'arbitrage',
  price_change_percent: 'movement',
  delay_ms: 'delay',
  latency_ms: 'delay',
  smart_money_score: 'smart_money',
  new_event: 'new_event',
  event_price_change_percent: 'price_change',
  limit_change: 'limit_change',
};

const TYPE_TO_METRIC: Record<AlertType, string> = {
  arbitrage: 'arb_percent',
  movement: 'price_change_percent',
  delay: 'delay_ms',
  smart_money: 'smart_money_score',
  new_event: 'new_event',
  price_change: 'event_price_change_percent',
  limit_change: 'limit_change',
};

export type AlertSink = (alert: AlertEvent) => void;

let sink: AlertSink | null = null;
let rulesCache: AlertRule[] | null = null;

export function setAlertSink(fn: AlertSink | null): void {
  sink = fn;
}

export function clearAlertRulesCache(): void {
  rulesCache = null;
}

/** Parse `metric > number` conditions into type + threshold. */
export function parseCondition(condition: string): { type: AlertType; threshold: number } | null {
  const m = condition.trim().match(/^([a-z_]+)\s*(>=|>|<=|<|==)\s*(-?\d+(?:\.\d+)?)$/i);
  if (!m) return null;
  const metric = m[1]!.toLowerCase();
  const op = m[2]!;
  const threshold = Number(m[3]);
  const type = METRIC_TO_TYPE[metric];
  if (!type || !Number.isFinite(threshold)) return null;
  // Evaluator uses ">= threshold" semantics; map > N to threshold N (exclusive lower
  // bounds are treated as the configured cutoff the same way as legacy rules).
  if (op === '<' || op === '<=') return null;
  return { type, threshold };
}

type RawRule = {
  id?: string; // brand-ok — opaque research/wire id
  name?: string;
  description?: string;
  type?: string;
  threshold?: number;
  enabled?: boolean;
  active?: boolean;
  condition?: string;
  channels?: string[];
  email_recipients?: string[];
  period?: string;
  pattern?: string;
  edge?: { min?: number; max?: number } | number;
  market_type?: string;
  geo?: string;
  state?: string;
  limit?: { min?: number; max?: number };
  latency_threshold?: number;
  bookmaker_comparison?: string;
  partner_ids?: string[];
  telegram_chat_id?: string; // brand-ok — opaque research/wire id
  event_id?: string; // brand-ok — opaque research/wire id
};

const PERIODS = new Set<AlertPeriod>(['prematch', 'live', 'all']);
const PATTERNS = new Set<AlertPattern>(['spike', 'drift', 'reversal', 'arbitrage']);

function normalizeChannels(raw: string[] | undefined): AlertChannel[] {
  const out: AlertChannel[] = [];
  for (const c of raw ?? ['ws']) {
    if (c === 'ws' || c === 'email' || c === 'telegram') out.push(c);
  }
  return out.length ? out : ['ws'];
}

function normalizePeriod(raw: string | undefined): AlertPeriod {
  if (!raw) return 'all';
  const p = raw.toLowerCase().trim();
  if (p === 'pregame') return 'prematch';
  if (PERIODS.has(p as AlertPeriod)) return p as AlertPeriod;
  return 'all';
}

function normalizePattern(raw: string | undefined): AlertPattern | undefined {
  if (!raw) return undefined;
  const p = raw.toLowerCase().trim();
  return PATTERNS.has(p as AlertPattern) ? (p as AlertPattern) : undefined;
}

function normalizeEdge(raw: RawRule['edge']): AlertEdge | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw < 0) return undefined;
    return { min: raw };
  }
  const min = Number(raw.min);
  if (!Number.isFinite(min) || min < 0) return undefined;
  const max = raw.max != null ? Number(raw.max) : undefined;
  if (max != null && (!Number.isFinite(max) || max < min)) {
    return { min };
  }
  return max != null ? { min, max } : { min };
}

function normalizeLimit(raw: RawRule['limit']): AlertLimit | undefined {
  if (raw == null || typeof raw !== 'object') return undefined;
  const min = raw.min != null ? Number(raw.min) : undefined;
  const max = raw.max != null ? Number(raw.max) : undefined;
  const out: AlertLimit = {};
  if (min != null && Number.isFinite(min)) out.min = min;
  if (max != null && Number.isFinite(max)) out.max = max;
  return out.min != null || out.max != null ? out : undefined;
}

function normalizeOptionalString(raw: string | undefined): string | undefined {
  if (raw == null) return undefined;
  const s = String(raw).trim();
  return s ? s : undefined;
}

/** True when rule applies to the given odds period. */
export function ruleMatchesPeriod(
  rule: AlertRule,
  period: AlertPeriod | 'pregame' | null | undefined
): boolean {
  if (!period || period === 'all' || rule.period === 'all') return true;
  const normalized = period === 'pregame' ? 'prematch' : period;
  return rule.period === normalized;
}

/**
 * Edge values are fractions (0.02 = 2%). `valueFraction` is the observed edge.
 * When the rule has no edge block, always matches.
 */
export function edgeMatches(rule: AlertRule, valueFraction: number): boolean {
  if (!rule.edge) return true;
  if (!Number.isFinite(valueFraction)) return false;
  if (valueFraction + 1e-12 < rule.edge.min) return false;
  if (rule.edge.max != null && valueFraction - 1e-12 > rule.edge.max) return false;
  return true;
}

function normalizeRule(raw: RawRule): AlertRule | null {
  if (!raw.id) return null;

  let type: AlertType | undefined;
  let threshold = Number(raw.threshold ?? 0);
  let condition = raw.condition ? String(raw.condition) : undefined;

  if (condition) {
    const parsed = parseCondition(condition);
    if (parsed) {
      type = parsed.type;
      threshold = parsed.threshold;
    }
  }

  if (!type && raw.type) {
    type = raw.type as AlertType;
  }
  if (!type) return null;

  if (!condition) {
    const metric = TYPE_TO_METRIC[type];
    if (metric) condition = `${metric} > ${threshold}`;
  }

  const enabled = raw.active !== undefined ? raw.active !== false : raw.enabled !== false;
  const pattern = normalizePattern(raw.pattern);
  // Default pattern from type when omitted
  const resolvedPattern =
    pattern ??
    (type === 'arbitrage'
      ? ('arbitrage' as const)
      : type === 'movement'
        ? ('spike' as const)
        : undefined);

  const latencyThreshold =
    raw.latency_threshold != null && Number.isFinite(Number(raw.latency_threshold))
      ? Number(raw.latency_threshold)
      : undefined;

  return {
    id: String(raw.id),
    name: raw.name ? String(raw.name) : undefined,
    description: raw.description ? String(raw.description) : undefined,
    type,
    threshold,
    enabled,
    condition,
    channels: normalizeChannels(raw.channels),
    emailRecipients: (raw.email_recipients ?? []).map(String),
    period: normalizePeriod(raw.period),
    pattern: resolvedPattern,
    edge: normalizeEdge(raw.edge),
    marketType: normalizeOptionalString(raw.market_type),
    geo: normalizeOptionalString(raw.geo),
    state: normalizeOptionalString(raw.state),
    limit: normalizeLimit(raw.limit),
    latencyThreshold,
    bookmakerComparison: normalizeOptionalString(raw.bookmaker_comparison),
    partnerIds: Array.isArray(raw.partner_ids)
      ? raw.partner_ids.map(String).filter(Boolean)
      : undefined,
    telegramChatId: normalizeOptionalString(raw.telegram_chat_id),
    eventId: normalizeOptionalString(raw.event_id),
    source: 'toml',
  };
}

type AlertsTomlFile = {
  defaults?: Record<string, unknown>;
  rules?: RawRule[];
};

/** Desk rules from alerts.toml only (no research event configs). */
export async function loadTomlAlertRules(): Promise<AlertRule[]> {
  if (rulesCache) return rulesCache;
  const raw = Bun.TOML.parse(await Bun.file(ALERTS_TOML_PATH).text()) as AlertsTomlFile;
  rulesCache = (raw.rules ?? []).map(normalizeRule).filter((r): r is AlertRule => r !== null);
  return rulesCache;
}

function eventConfigToAlertRule(cfg: {
  id: string; // brand-ok — opaque research/wire id
  eventId: string; // brand-ok — opaque research/wire id
  partnerIds: string[];
  trigger: 'new_event' | 'price_change' | 'limit_change';
  threshold?: number;
  actions: Array<'telegram' | 'webhook'>;
  telegramChatId?: string; // brand-ok — opaque research/wire id
  enabled: boolean;
}): AlertRule {
  const type = cfg.trigger;
  const threshold = cfg.threshold ?? 0;
  return {
    id: cfg.id,
    name: cfg.id,
    type,
    threshold,
    enabled: cfg.enabled,
    condition: `${TYPE_TO_METRIC[type]} > ${threshold}`,
    channels: cfg.actions.includes('telegram') ? ['telegram'] : ['ws'],
    emailRecipients: [],
    period: 'all',
    eventId: cfg.eventId,
    partnerIds: cfg.partnerIds ?? [],
    telegramChatId: cfg.telegramChatId,
    source: 'research',
  };
}

/**
 * Unified rules: alerts.toml + data/research/alerts.json event-monitor configs.
 * Event kinds (new_event|price_change|limit_change) are editable via the same CRUD surface.
 */
export async function loadAlertRules(): Promise<AlertRule[]> {
  const toml = await loadTomlAlertRules();
  const { listEventAlertConfigs } = await import('../../research/event-alert-engine.ts');
  const configs = await listEventAlertConfigs();
  return [...toml, ...configs.map(eventConfigToAlertRule)];
}

/** Drop cache and re-parse `config/operator-research/alerts.toml` (+ refresh research merge). */
export async function reloadAlertRules(): Promise<AlertRule[]> {
  clearAlertRulesCache();
  return loadAlertRules();
}

export function alertsTomlPath(): string {
  return ALERTS_TOML_PATH;
}

function ruleToToml(rule: AlertRule): RawRule {
  const out: RawRule = {
    id: rule.id,
    name: rule.name,
    description: rule.description,
    active: rule.enabled,
    condition: rule.condition ?? `${TYPE_TO_METRIC[rule.type]} > ${rule.threshold}`,
    channels: rule.channels,
    email_recipients: rule.emailRecipients,
    period: rule.period,
  };
  if (rule.pattern) out.pattern = rule.pattern;
  if (rule.edge) {
    out.edge =
      rule.edge.max != null ? { min: rule.edge.min, max: rule.edge.max } : { min: rule.edge.min };
  }
  if (rule.marketType) out.market_type = rule.marketType;
  if (rule.geo) out.geo = rule.geo;
  if (rule.state) out.state = rule.state;
  if (rule.limit) out.limit = rule.limit;
  if (rule.latencyThreshold != null) out.latency_threshold = rule.latencyThreshold;
  if (rule.bookmakerComparison) out.bookmaker_comparison = rule.bookmakerComparison;
  if (rule.partnerIds?.length) out.partner_ids = rule.partnerIds;
  if (rule.telegramChatId) out.telegram_chat_id = rule.telegramChatId;
  if (rule.eventId) out.event_id = rule.eventId;
  return out;
}

async function persistAlertRules(rules: AlertRule[]): Promise<void> {
  let defaults: Record<string, unknown> = {
    enabled: true,
    min_arb_edge_pct: 1.5,
    min_move_pct: 5.0,
    min_delay_ms: 10000,
  };
  try {
    const existing = Bun.TOML.parse(await Bun.file(ALERTS_TOML_PATH).text()) as AlertsTomlFile;
    if (existing.defaults && typeof existing.defaults === 'object') {
      defaults = { ...defaults, ...existing.defaults };
    }
  } catch {
    /* keep defaults */
  }
  const text = tomlStringify({
    defaults,
    rules: rules.map(ruleToToml),
  });
  await Bun.write(ALERTS_TOML_PATH, text.endsWith('\n') ? text : `${text}\n`);
  rulesCache = rules;
}

export type AlertRuleInput = {
  id: string; // brand-ok — opaque research/wire id
  name?: string;
  description?: string;
  condition?: string;
  type?: AlertType;
  threshold?: number;
  active?: boolean;
  enabled?: boolean;
  channels?: string[];
  email_recipients?: string[];
  period?: string;
  pattern?: string;
  edge?: { min?: number; max?: number } | number;
  market_type?: string;
  geo?: string;
  state?: string;
  limit?: AlertLimit;
  latency_threshold?: number;
  bookmaker_comparison?: string;
  event_id?: string; // brand-ok — opaque research/wire id
  partner_ids?: string[];
  telegram_chat_id?: string; // brand-ok — opaque research/wire id
};

async function upsertEventAlertRule(
  input: AlertRuleInput,
  normalized: AlertRule
): Promise<AlertRule> {
  const { listEventAlertConfigs, saveEventAlertConfigs } =
    await import('../../research/event-alert-engine.ts');
  const configs = await listEventAlertConfigs();
  const trigger = normalized.type as 'new_event' | 'price_change' | 'limit_change';
  const wantTelegram =
    normalized.channels.includes('telegram') || (input.channels ?? []).includes('telegram');
  const next = {
    id: normalized.id,
    eventId: input.event_id?.trim() || normalized.eventId || '*',
    partnerIds: Array.isArray(input.partner_ids)
      ? input.partner_ids.map(String)
      : (normalized.partnerIds ?? []),
    trigger,
    ...(trigger === 'price_change'
      ? { threshold: input.threshold ?? normalized.threshold ?? 2 }
      : {}),
    actions: (wantTelegram ? ['telegram'] : ['telegram']) as Array<'telegram' | 'webhook'>,
    telegramChatId: input.telegram_chat_id?.trim() || normalized.telegramChatId,
    enabled: normalized.enabled,
    createdAt: new Date().toISOString(),
  };

  const idx = configs.findIndex(c => c.id === next.id);
  if (idx >= 0) {
    next.createdAt = configs[idx]!.createdAt;
    configs[idx] = next;
  } else {
    configs.push(next);
  }
  await saveEventAlertConfigs(configs);
  return eventConfigToAlertRule(next);
}

export async function upsertAlertRule(input: AlertRuleInput): Promise<AlertRule> {
  const typeHint =
    input.type && isEventAlertType(input.type)
      ? input.type
      : input.condition?.includes('event_price_change')
        ? ('price_change' as const)
        : input.condition?.trim() === 'new_event' || input.condition?.startsWith('new_event ')
          ? ('new_event' as const)
          : input.condition?.startsWith('limit_change')
            ? ('limit_change' as const)
            : input.type;

  const normalized = normalizeRule({
    id: input.id,
    name: input.name,
    description: input.description,
    condition: input.condition,
    type: typeHint,
    threshold: input.threshold,
    active: input.active,
    enabled: input.enabled,
    channels: input.channels,
    email_recipients: input.email_recipients,
    period: input.period,
    pattern: input.pattern,
    edge: input.edge,
    market_type: input.market_type,
    geo: input.geo,
    state: input.state,
    limit: input.limit,
    latency_threshold: input.latency_threshold,
    bookmaker_comparison: input.bookmaker_comparison,
  });
  if (!normalized) {
    throw new Error(
      'Invalid rule: need id plus a parseable condition (e.g. price_change_percent > 5) or type'
    );
  }

  if (isEventAlertType(normalized.type)) {
    return upsertEventAlertRule(input, normalized);
  }

  const rules = await loadTomlAlertRules();
  const idx = rules.findIndex(r => r.id === normalized.id);
  if (idx >= 0) rules[idx] = normalized;
  else rules.push(normalized);
  await persistAlertRules(rules);
  return normalized;
}

export async function deleteAlertRule(id: string): Promise<boolean> {
  // brand-ok — opaque research/wire id
  const { listEventAlertConfigs, saveEventAlertConfigs } =
    await import('../../research/event-alert-engine.ts');
  const configs = await listEventAlertConfigs();
  const withoutEvent = configs.filter(c => c.id !== id);
  if (withoutEvent.length !== configs.length) {
    await saveEventAlertConfigs(withoutEvent);
    return true;
  }

  const rules = await loadTomlAlertRules();
  const next = rules.filter(r => r.id !== id);
  if (next.length === rules.length) return false;
  await persistAlertRules(next);
  return true;
}

function severityFor(type: AlertType, value: number, threshold: number): AlertEvent['severity'] {
  if (type === 'arbitrage') {
    if (value >= threshold * 2) return 'critical';
    if (value >= threshold) return 'warn';
    return 'info';
  }
  if (value >= threshold * 1.5) return 'critical';
  if (value >= threshold) return 'warn';
  return 'info';
}

async function deliverEmail(alert: AlertEvent, recipients: string[]): Promise<void> {
  if (!recipients.length) return;
  const webhook = Bun.env.ALERT_EMAIL_WEBHOOK?.trim();
  if (!webhook) {
    console.error(
      `[alerts:email] skipped (set ALERT_EMAIL_WEBHOOK) → ${recipients.join(', ')} · ${alert.title}`
    );
    return;
  }
  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        to: recipients,
        subject: `[alert] ${alert.title}`,
        text: `${alert.details}\n\nrule=${alert.ruleId} type=${alert.type} severity=${alert.severity}`,
        alert,
      }),
    });
  } catch (err) {
    console.error('[alerts:email]', err instanceof Error ? err.message : String(err));
  }
}

async function deliverTelegram(alert: AlertEvent, rule: AlertRule): Promise<void> {
  const payload = (alert.payload ?? {}) as {
    partner_ids?: string[];
    partners?: Array<{ id?: string }>; // brand-ok — opaque research/wire id
    legs?: Array<{ host?: string | null; bookmaker?: string }>;
    partnerId?: string; // brand-ok — opaque research/wire id
  };
  const partnerIds = [
    ...(payload.partner_ids ?? []),
    ...((payload.partners ?? []).map(p => p.id).filter(Boolean) as string[]),
    ...(payload.partnerId ? [payload.partnerId] : []),
  ];
  const ctx = resolvePartnerContext({
    partnerIds,
    hosts: (payload.legs ?? []).map(l => l.host),
    bookmakerNames: (payload.legs ?? []).map(l => l.bookmaker),
  });
  const targets = ctx.partnerIds.length
    ? ctx.partnerIds
    : rule.partnerIds?.length
      ? rule.partnerIds
      : [];

  if (!targets.length && !rule.telegramChatId) {
    console.error(`[alerts:telegram] skipped (no partner) · ${alert.title}`);
    return;
  }

  const message = [
    alert.title,
    alert.details,
    `rule=${alert.ruleId}`,
    `severity=${alert.severity}`,
    rule.telegramChatId ? `chat_override=${rule.telegramChatId}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  // Prefer per-partner desk routing; chat override is recorded in message body.
  const sendTo = targets.length ? targets : ['__default__'];
  for (const partnerId of sendTo) {
    if (partnerId === '__default__') continue;
    const result = await sendPartnerSignal({
      partnerId,
      message,
      topic: 'alerts',
    });
    if (!result.ok) {
      console.error(`[alerts:telegram] ${partnerId}: ${result.error}`);
    }
  }
}

async function deliverChannels(alert: AlertEvent, rule: AlertRule): Promise<void> {
  const channels = rule.channels.length ? rule.channels : (['ws'] as AlertChannel[]);
  alert.channels = channels;
  if (channels.includes('ws')) sink?.(alert);
  if (channels.includes('email')) await deliverEmail(alert, rule.emailRecipients);
  if (channels.includes('telegram')) await deliverTelegram(alert, rule);
}

/** Persist alert; returns true when newly inserted (deduped by id). */
async function emit(alert: AlertEvent, rule: AlertRule, db: Database): Promise<boolean> {
  ensureAlertsSchema(db);
  const result = db
    .query(
      `INSERT OR IGNORE INTO alerts (
        id, type, rule_id, severity, title, details, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      alert.id,
      alert.type,
      alert.ruleId,
      alert.severity,
      alert.title,
      alert.details,
      JSON.stringify(alert.payload),
      alert.createdAt
    );
  if (result.changes === 0) return false;
  await deliverChannels(alert, rule);
  return true;
}

export function listRecentAlerts(limit = 50, db: Database = openOddsDb()): AlertEvent[] {
  ensureAlertsSchema(db);
  const rows = db
    .query(
      `SELECT id, type, rule_id AS ruleId, severity, title, details,
              payload_json AS payloadJson, created_at AS createdAt
       FROM alerts ORDER BY created_at DESC LIMIT ?`
    )
    .all(limit) as Array<{
    id: string; // brand-ok — opaque research/wire id
    type: AlertType;
    ruleId: string; // brand-ok — opaque research/wire id
    severity: AlertEvent['severity'];
    title: string;
    details: string;
    payloadJson: string;
    createdAt: string;
  }>;
  return rows.map(r => ({
    id: r.id,
    type: r.type,
    ruleId: r.ruleId,
    severity: r.severity,
    title: r.title,
    details: r.details,
    payload: JSON.parse(r.payloadJson),
    createdAt: r.createdAt,
  }));
}

function pickRules(
  rules: AlertRule[],
  type: AlertType,
  opts: { period?: AlertPeriod; pattern?: AlertPattern; edgeFraction?: number } = {}
): AlertRule[] {
  return rules.filter(r => {
    if (!r.enabled || r.type !== type) return false;
    if (opts.period && !ruleMatchesPeriod(r, opts.period)) return false;
    if (opts.pattern && r.pattern && r.pattern !== opts.pattern) return false;
    if (opts.edgeFraction != null && !edgeMatches(r, opts.edgeFraction)) return false;
    return true;
  });
}

export async function evaluateAlerts(
  opts: {
    arbs?: ArbitrageOpportunity[];
    movements?: LineMovement[];
    smartMoney?: SmartMoneySignal[];
    /** Optional period context for filtering rules (default: all). */
    period?: AlertPeriod;
  } = {},
  db: Database = openOddsDb()
): Promise<AlertEvent[]> {
  ensureAlertsSchema(db);
  const rules = await loadAlertRules();
  const registry = loadMergedRegistry();
  const emitted: AlertEvent[] = [];
  const now = new Date().toISOString();
  const period = opts.period ?? 'all';

  const arbRules = pickRules(rules, 'arbitrage', { period });
  const minArb = Math.min(...arbRules.map(r => r.threshold), 1.5);
  const arbs = opts.arbs ?? detectCrossBookArbitrage({ minEdgePct: minArb }, db);
  for (const arbRule of arbRules) {
    for (const a of arbs) {
      if (a.edgePct < arbRule.threshold) continue;
      if (arbRule.pattern && arbRule.pattern !== 'arbitrage') continue;
      if (!edgeMatches(arbRule, a.edgePct / 100)) continue;
      const ctx = resolvePartnerContext(
        {
          hosts: a.legs.map(l => l.host),
          bookmakerNames: a.legs.map(l => l.bookmaker),
        },
        registry
      );
      if (
        !ruleMatchesPartners(arbRule, ctx, {
          marketCode: a.marketCode,
          requireArbEligible: true,
        })
      ) {
        continue;
      }
      const partnerFields = enrichAlertPartnerFields(ctx);
      const legKey = a.legs
        .map(l => `${l.selection}:${l.bookmaker}:${l.oddsDecimal.toFixed(3)}`)
        .sort()
        .join('|');
      const alert: AlertEvent = {
        id: `arb-${a.eventId}-${a.marketTypeId}-${arbRule.id}-${Bun.hash(legKey).toString(16)}`,
        type: 'arbitrage',
        ruleId: arbRule.id,
        severity: severityFor('arbitrage', a.edgePct, arbRule.threshold),
        title: `Arbitrage ${a.edgePct.toFixed(2)}% · ${a.homeTeam ?? '?'} vs ${a.awayTeam ?? '?'}`,
        details: a.legs
          .map(l => `${l.selection}@${l.bookmaker} ${l.oddsDecimal.toFixed(3)}`)
          .join(' · '),
        payload: {
          ...a,
          period: arbRule.period,
          pattern: arbRule.pattern,
          edge: arbRule.edge,
          ...partnerFields,
        },
        createdAt: now,
      };
      if (await emit(alert, arbRule, db)) emitted.push(alert);
    }
  }

  const moveRules = pickRules(rules, 'movement', { period });
  const minMove = Math.min(...moveRules.map(r => r.threshold), 5);
  const movements =
    opts.movements ?? detectNotableMovements({ minAbsPct: minMove, sinceMs: 1, limit: 100 }, db);
  for (const moveRule of moveRules) {
    for (const m of movements) {
      if (Math.abs(m.percentageChange) < moveRule.threshold) continue;
      const edgeFrac = Math.abs(m.percentageChange) / 100;
      if (!edgeMatches(moveRule, edgeFrac)) continue;
      // Pattern filter: spike/drift/reversal when set
      if (moveRule.pattern === 'arbitrage') continue;
      const moveBook = db
        .query(
          `SELECT b.name AS bookmaker, b.host AS host
           FROM bookmaker_event_mapping bem
           JOIN bookmakers b ON bem.bookmaker_id = b.id
           WHERE bem.id = ?`
        )
        .get(m.mappingId) as { bookmaker: string; host: string | null } | null;
      const ctx = resolvePartnerContext(
        {
          hosts: moveBook?.host ? [moveBook.host] : [],
          bookmakerNames: moveBook?.bookmaker ? [moveBook.bookmaker] : [],
        },
        registry
      );
      if (!ruleMatchesPartners(moveRule, ctx)) continue;
      const partnerFields = enrichAlertPartnerFields(ctx);
      const alert: AlertEvent = {
        id: `move-${m.mappingId}-${m.selection}-${moveRule.id}-${m.latestTimestamp}`,
        type: 'movement',
        ruleId: moveRule.id,
        severity: severityFor('movement', Math.abs(m.percentageChange), moveRule.threshold),
        title: `Line move ${m.direction} ${m.percentageChange.toFixed(2)}% · ${m.selection}`,
        details: `${m.from} → ${m.to} over ${m.timeDeltaMs}ms (mapping ${m.mappingId}) · ${moveRule.pattern ?? 'any'}`,
        payload: {
          ...m,
          bookmaker: moveBook?.bookmaker,
          host: moveBook?.host,
          period: moveRule.period,
          pattern: moveRule.pattern,
          edge: moveRule.edge,
          ...partnerFields,
        },
        createdAt: now,
      };
      if (await emit(alert, moveRule, db)) emitted.push(alert);
    }
  }

  const smartRules = pickRules(rules, 'smart_money', { period });
  for (const smartRule of smartRules) {
    const smart = opts.smartMoney ?? (await detectSmartMoney({ sinceMs: 1, limit: 50 }, db));
    for (const s of smart) {
      if (s.score < smartRule.threshold && Math.abs(s.movePct) < 1.5) continue;
      if (!edgeMatches(smartRule, Math.abs(s.movePct) / 100)) continue;
      const ctx = resolvePartnerContext(
        {
          bookmakerNames: s.bookmaker ? [s.bookmaker] : [],
        },
        registry
      );
      if (!ruleMatchesPartners(smartRule, ctx)) continue;
      const partnerFields = enrichAlertPartnerFields(ctx);
      const alert: AlertEvent = {
        id: `smart-${s.mappingId}-${s.selection}-${smartRule.id}-${Bun.hash(s.details).toString(16)}`,
        type: 'smart_money',
        ruleId: smartRule.id,
        severity: 'warn',
        title: `Smart money · ${s.bookmaker}`,
        details: s.details,
        payload: {
          ...s,
          period: smartRule.period,
          pattern: smartRule.pattern,
          edge: smartRule.edge,
          ...partnerFields,
        },
        createdAt: now,
      };
      if (await emit(alert, smartRule, db)) emitted.push(alert);
    }
  }

  const delayRules = pickRules(rules, 'delay', { period });
  if (delayRules.length) {
    // Reuse arb event/market pairs as delay probe seeds (cross-book lag only meaningful there).
    const seeds = arbs.slice(0, 25);
    for (const delayRule of delayRules) {
      const threshold = delayRule.latencyThreshold ?? delayRule.threshold;
      for (const a of seeds) {
        const delays = detectDelays(a.eventId, a.marketTypeId, {}, db);
        if (!delays?.length) continue;
        for (const d of delays) {
          if (d.delayMs < threshold) continue;
          const ctx = resolvePartnerContext(
            {
              hosts: d.host ? [d.host] : [],
              bookmakerNames: [d.bookmaker, d.comparedTo],
            },
            registry
          );
          if (
            !ruleMatchesPartners(delayRule, ctx, {
              marketCode: a.marketCode,
              latencyMs: d.delayMs,
            })
          ) {
            continue;
          }
          const partnerFields = enrichAlertPartnerFields(ctx);
          const alert: AlertEvent = {
            id: `delay-${a.eventId}-${a.marketTypeId}-${d.bookmaker}-${delayRule.id}-${Bun.hash(String(d.delayMs)).toString(16)}`,
            type: 'delay',
            ruleId: delayRule.id,
            severity: severityFor('delay', d.delayMs, threshold),
            title: `Delay ${d.delayMs}ms · ${d.bookmaker} vs ${d.comparedTo}`,
            details: `${a.homeTeam ?? '?'} vs ${a.awayTeam ?? '?'} · lag ${d.delayMs}ms behind ${d.comparedTo}`,
            payload: {
              ...d,
              eventId: a.eventId,
              marketTypeId: a.marketTypeId,
              marketCode: a.marketCode,
              period: delayRule.period,
              ...partnerFields,
            },
            createdAt: now,
          };
          if (await emit(alert, delayRule, db)) emitted.push(alert);
        }
      }
    }
  }

  return emitted;
}
