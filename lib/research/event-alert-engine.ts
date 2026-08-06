// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Event-scoped alert engine — new_event / price_change / limit_change.
 * Persists into shared `alerts` table for /api/alerts history.
 * Telegram delivery goes through partners-signal (+ ops chat fallback).
 *
 * @see lib/operator-research/matching/alerts.ts
 * @see lib/operator-research/partners-signal.ts
 */

// eslint-disable-next-line no-restricted-imports -- ensure parent dirs before sqlite/file write
import { mkdirSync } from 'node:fs';
import { joinPath } from '../path-bun.ts';
import type { Database } from 'bun:sqlite';
import { ensureAlertsSchema } from '../operator-research/matching/alerts.ts';
import {
  normalizeSignalChatId,
  resolveTelegramTarget,
} from '../operator-research/partners-signal.ts';
import { ROOT } from '../operator-research/paths.ts';
import { openOddsDb } from '../operator-research/odds/odds-store.ts';
import { loadTelegramEnv } from '../telegram/telegram-config.ts';
import { sendTelegramBotMessage } from '../telegram/telegram-api.ts';
import type { EventAlertConfig, EventChange } from './types/event.ts';

const ALERTS_JSON = joinPath(ROOT, 'data/research/alerts.json');

async function loadConfigs(): Promise<EventAlertConfig[]> {
  const file = Bun.file(ALERTS_JSON);
  if (!(await file.exists())) {
    mkdirSync(joinPath(ROOT, 'data/research'), { recursive: true });
    const defaults: EventAlertConfig[] = [
      {
        id: 'evt-all-new',
        eventId: '*',
        partnerIds: [],
        trigger: 'new_event',
        actions: ['telegram'],
        enabled: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'evt-all-price-2pct',
        eventId: '*',
        partnerIds: [],
        trigger: 'price_change',
        threshold: 2,
        actions: ['telegram'],
        enabled: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'evt-all-limit',
        eventId: '*',
        partnerIds: [],
        trigger: 'limit_change',
        actions: ['telegram'],
        enabled: true,
        createdAt: new Date().toISOString(),
      },
    ];
    await Bun.write(ALERTS_JSON, JSON.stringify(defaults, null, 2));
    return defaults;
  }
  try {
    const raw = (await file.json()) as EventAlertConfig[] | { alerts?: EventAlertConfig[] };
    return Array.isArray(raw) ? raw : (raw.alerts ?? []);
  } catch {
    return [];
  }
}

export async function listEventAlertConfigs(): Promise<EventAlertConfig[]> {
  return loadConfigs();
}

export async function saveEventAlertConfigs(configs: EventAlertConfig[]): Promise<void> {
  mkdirSync(joinPath(ROOT, 'data/research'), { recursive: true });
  await Bun.write(ALERTS_JSON, JSON.stringify(configs, null, 2));
}

export function eventAlertJsonPath(): string {
  return ALERTS_JSON;
}

/** Exported for unit tests — threshold gating for price_change. */
export function matchesEventAlertConfig(cfg: EventAlertConfig, change: EventChange): boolean {
  if (!cfg.enabled) return false;
  if (cfg.trigger !== change.kind) return false;
  if (cfg.eventId !== '*' && cfg.eventId !== change.canonicalId) return false;
  if (cfg.partnerIds?.length && !cfg.partnerIds.includes(change.partnerId)) return false;
  if (
    cfg.trigger === 'price_change' &&
    typeof cfg.threshold === 'number' &&
    typeof change.changePercent === 'number' &&
    Math.abs(change.changePercent) < cfg.threshold
  ) {
    return false;
  }
  return true;
}
// brand-ok — opaque research/wire id
async function sendOpsTelegram(chatId: string, text: string): Promise<boolean> {
  // brand-ok — opaque research/wire id
  // Avoid hanging unit tests on live Bot API round-trips.
  if (Bun.env.BUN_TEST === '1' || Bun.env.RESEARCH_ALERTS_DRY_RUN === '1') return false;
  const normalized = normalizeSignalChatId(chatId) ?? chatId.trim();
  if (!normalized) return false;
  const botToken = loadTelegramEnv().effectiveToken;
  if (!botToken) return false;
  try {
    const sent = await sendTelegramBotMessage(botToken, {
      chatId: normalized,
      text,
    });
    return sent.ok;
  } catch {
    return false;
  }
}

/**
 * Prefer partners-signal chat resolution, then ops chat.
 * Sends plain text (no Markdown) to avoid Bot API entity parse failures.
 */
export async function deliverEventTelegram(opts: {
  // brand-ok — opaque research/wire id
  partnerId: string; // brand-ok — opaque research/wire id
  message: string; // brand-ok — opaque research/wire id
  telegramChatId?: string; // brand-ok — opaque research/wire id
}): Promise<boolean> {
  const override = opts.telegramChatId?.trim();
  if (override) {
    return sendOpsTelegram(override, opts.message);
  }

  const target = resolveTelegramTarget(opts.partnerId, { topic: 'alerts' });
  if (target?.chatId && (await sendOpsTelegram(target.chatId, opts.message))) {
    return true;
  }

  const opsChat =
    Bun.env.TELEGRAM_OPS_CHAT_ID?.trim() || Bun.env.TELEGRAM_DEFAULT_CHAT_ID?.trim() || '';
  if (opsChat) return sendOpsTelegram(opsChat, opts.message);
  return false;
}

function insertAlertHistory(db: Database, change: EventChange, cfg: EventAlertConfig): void {
  ensureAlertsSchema(db);
  const createdAt = new Date().toISOString();
  const id = `evt_${cfg.id}_${change.canonicalId}_${change.kind}_${Date.now().toString(36)}`;
  const title = `${change.kind}: ${change.event.homeTeam} vs ${change.event.awayTeam}`;
  const details = [
    `${change.event.sport} · ${change.event.league}`,
    `partner=${change.partnerId}`,
    change.changePercent != null ? `Δ ${change.changePercent.toFixed(2)}%` : null,
    change.oldLimit != null && change.newLimit != null
      ? `limit ${change.oldLimit} → ${change.newLimit}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  db.query(
    `INSERT OR IGNORE INTO alerts
       (id, type, rule_id, severity, title, details, payload_json, created_at)
     VALUES ($id, $type, $rule, $sev, $title, $details, $payload, $ts)`
  ).run({
    $id: id,
    $type: change.kind,
    $rule: cfg.id,
    $sev: change.kind === 'new_event' ? 'info' : 'warn',
    $title: title,
    $details: details,
    $payload: JSON.stringify({
      canonicalId: change.canonicalId,
      partnerId: change.partnerId,
      partnerEventId: change.partnerEventId,
      changePercent: change.changePercent,
      oldLimit: change.oldLimit,
      newLimit: change.newLimit,
      session: change.event.session,
    }),
    $ts: createdAt,
  });
}

export type FireEventAlertsResult = {
  considered: number;
  fired: number;
  telegramSent: number;
  webhooksSent: number;
};

/** POST JSON payload to EVENT_ALERT_WEBHOOK / ALERT_WEBHOOK_URL when configured. */
export async function deliverEventWebhook(payload: Record<string, unknown>): Promise<boolean> {
  if (Bun.env.BUN_TEST === '1' || Bun.env.RESEARCH_ALERTS_DRY_RUN === '1') return false;
  const url =
    Bun.env.EVENT_ALERT_WEBHOOK?.trim() ||
    Bun.env.ALERT_WEBHOOK_URL?.trim() ||
    Bun.env.ALERT_EMAIL_WEBHOOK?.trim() ||
    '';
  if (!url) return false;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8_000),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

export async function processEventChanges(
  changes: EventChange[],
  db: Database = openOddsDb()
): Promise<FireEventAlertsResult> {
  const configs = await loadConfigs();
  let fired = 0;
  let telegramSent = 0;
  let webhooksSent = 0;

  for (const change of changes) {
    const matching = configs.filter(c => matchesEventAlertConfig(c, change));
    for (const cfg of matching) {
      fired += 1;
      insertAlertHistory(db, change, cfg);
      const msg = [
        `🔔 ${change.kind}`,
        `${change.event.homeTeam} vs ${change.event.awayTeam}`,
        `${change.event.sport} · ${change.event.league} · ${change.event.session}`,
        `partner: ${change.partnerId}`,
        change.changePercent != null ? `price Δ ${change.changePercent.toFixed(2)}%` : null,
        change.oldLimit != null && change.newLimit != null
          ? `limit ${change.oldLimit} → ${change.newLimit}`
          : null,
      ]
        .filter(Boolean)
        .join('\n');

      if (cfg.actions.includes('telegram')) {
        if (
          await deliverEventTelegram({
            partnerId: change.partnerId,
            message: msg,
            telegramChatId: cfg.telegramChatId,
          })
        ) {
          telegramSent += 1;
        }
      }
      if (cfg.actions.includes('webhook')) {
        if (
          await deliverEventWebhook({
            kind: change.kind,
            ruleId: cfg.id,
            canonicalId: change.canonicalId,
            partnerId: change.partnerId,
            partnerEventId: change.partnerEventId,
            changePercent: change.changePercent ?? null,
            oldLimit: change.oldLimit ?? null,
            newLimit: change.newLimit ?? null,
            event: {
              sport: change.event.sport,
              league: change.event.league,
              homeTeam: change.event.homeTeam,
              awayTeam: change.event.awayTeam,
              session: change.event.session,
              startTime: change.event.startTime,
            },
            message: msg,
            at: new Date().toISOString(),
          })
        ) {
          webhooksSent += 1;
        }
      }
    }
  }

  return { considered: changes.length, fired, telegramSent, webhooksSent };
}
