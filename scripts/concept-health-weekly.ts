#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Weekly concept health summary — compact rollup of the concept-health
 * report for ops review, optionally pushed to the Telegram ops chat.
 *
 *   bun scripts/concept-health-weekly.ts [--telegram] [--output text|json]
 *
 * Env: CONCEPT_HEALTH_WEEKLY_OUTPUT · CONCEPT_HEALTH_TELEGRAM=1.
 *
 * The Telegram path is best-effort: when lib/telegram is unavailable or
 * credentials are missing, a warning is printed and the command still exits
 * 0 with the console output.
 */
import { colorize, jsonOut } from '../lib/console-depth.ts';
import { PORTAL_SEMANTIC_CONCEPTS } from '../lib/portal/semantic-vocabulary.ts';
import type { DomainConceptInput } from './concept-domain-list.ts';
import {
  addedWithinPeriod,
  buildHealthReport,
  countPendingProposals,
  eventsWithinPeriod,
  loadLifecycleStore,
  type ConceptHealthReport,
  type ConceptLifecycleStore,
} from './concept-health.ts';
import { countPortalConceptUsages } from '../lib/portal/concept-usage.ts';
import { runConceptMetadataValidation } from './validate-concept-metadata.ts';

const WEEK_DAYS = 7;

export type ConceptWeeklySummary = {
  weekOf: string; // ISO date
  total: number;
  addedThisWeek: number;
  deprecatedThisWeek: number;
  provenancePct: number;
  unused: number;
  pendingProposals: number;
  ok: boolean;
};

export type ConceptWeeklyInput = {
  concepts: readonly DomainConceptInput[];
  report: ConceptHealthReport;
  lifecycle: ConceptLifecycleStore;
  now?: Date;
};

export function buildWeeklySummary(input: ConceptWeeklyInput): ConceptWeeklySummary {
  const now = input.now ?? new Date();
  const added = addedWithinPeriod(input.concepts, WEEK_DAYS, now);
  const deprecatedEvents = eventsWithinPeriod(input.lifecycle.history, WEEK_DAYS, now).filter(
    e => e.action === 'deprecate'
  );
  return {
    weekOf: now.toISOString().slice(0, 10),
    total: input.report.totals.total,
    addedThisWeek: added.length,
    deprecatedThisWeek: deprecatedEvents.length,
    provenancePct: input.report.provenance.coveragePct,
    unused: input.report.usage.zeroUsageIds.length,
    pendingProposals: countPendingProposals(input.lifecycle.proposals),
    ok: input.report.ok,
  };
}

export function formatWeeklySummary(summary: ConceptWeeklySummary): string {
  return [
    `concept health · week of ${summary.weekOf}`,
    `concepts: ${summary.total} total (+${summary.addedThisWeek} this week · ${summary.deprecatedThisWeek} deprecated this week)`,
    `provenance: ${summary.provenancePct}%`,
    `unused: ${summary.unused} (page.* excluded)`,
    `pending proposals: ${summary.pendingProposals}`,
    `verdict: ${summary.ok ? 'ok' : 'FAIL'}`,
  ].join('\n');
}

export async function runConceptHealthWeekly(): Promise<{
  summary: ConceptWeeklySummary;
  report: ConceptHealthReport;
}> {
  const [metadata, usageCounts, lifecycle] = await Promise.all([
    runConceptMetadataValidation(),
    countPortalConceptUsages(),
    loadLifecycleStore(),
  ]);
  const report = buildHealthReport({
    concepts: PORTAL_SEMANTIC_CONCEPTS,
    usageCounts,
    metadata,
    lifecycle,
    periodDays: WEEK_DAYS,
  });
  return {
    summary: buildWeeklySummary({ concepts: PORTAL_SEMANTIC_CONCEPTS, report, lifecycle }),
    report,
  };
}

/** Best-effort Telegram send; never throws, never fails the command. */
export async function trySendTelegram(text: string): Promise<{ sent: boolean; reason?: string }> {
  try {
    const { loadTelegramEnv } = await import('../lib/telegram/telegram-config.ts');
    const env = loadTelegramEnv();
    if (!env.effectiveToken || !env.opsChatId) {
      return {
        sent: false,
        reason: 'missing TELEGRAM_BOT_FACTORY/TELEGRAM_BOT_TOKEN or TELEGRAM_OPS_CHAT_ID',
      };
    }
    const { sendTelegramBotMessage } = await import('../lib/telegram/telegram-api.ts');
    const res = await sendTelegramBotMessage(env.effectiveToken, {
      chatId: env.opsChatId,
      text,
    });
    return res.ok ? { sent: true } : { sent: false, reason: res.description ?? 'send failed' };
  } catch (err) {
    return { sent: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

function resolveStr(argv: readonly string[], flag: string, envKey: string): string | undefined {
  const eq = argv.find(a => a.startsWith(`${flag}=`));
  const i = argv.indexOf(flag);
  const fromFlag = (eq ? eq.slice(flag.length + 1) : i !== -1 ? argv[i + 1] : undefined)?.trim();
  if (fromFlag) return fromFlag;
  return Bun.env[envKey]?.trim() || undefined;
}

function resolveBool(argv: readonly string[], flag: string, envKey: string): boolean {
  if (argv.includes(flag)) return true;
  const raw = Bun.env[envKey]?.trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

async function main(): Promise<void> {
  const output =
    resolveStr(Bun.argv, '--output', 'CONCEPT_HEALTH_WEEKLY_OUTPUT') === 'json' ? 'json' : 'text';
  const telegram = resolveBool(Bun.argv, '--telegram', 'CONCEPT_HEALTH_TELEGRAM');

  const { summary } = await runConceptHealthWeekly();
  const text = formatWeeklySummary(summary);

  if (output === 'json') {
    jsonOut(summary);
  } else {
    console.log(summary.ok ? text : colorize(text, '#f85149'));
  }

  if (telegram) {
    const result = await trySendTelegram(text);
    if (result.sent) {
      console.log(colorize('telegram: sent to ops chat', '#3fb950'));
    } else {
      console.warn(colorize(`telegram: skipped (${result.reason})`, '#8b949e'));
    }
  }
}

if (import.meta.main) {
  await main();
}
