#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/guides/util/main — import.meta.main CLI entry guard
/**
 * Partner accounting domain-trigger pipeline.
 *
 *   bun run partners:event -- deposit_received --partner ASH --amount 1000 --rail venmo
 *   bun run partners:event -- credit_extended --partner ASH --amount 5000 [--dry-run]
 *
 * Maps a domain trigger to a SHIPPED PARTNER_OPS_EVENT_CODE and appends the
 * factory-mirror ledger event. Rebuild the registry after appending:
 *   bun run partners:build
 * The bake recomputes deposits[] / credits[] / freeRollApplied / ledgerEvents
 * aggregates from the events JSONL, so appended events are reflected in
 * tracking.accounting.* immediately on the next build.
 *
 * Reconciliation vs the roadmap (Wave 5):
 * - Only triggers with a shipped event code are implementable. The roadmap's
 *   withdrawal_processed / credit_repaid / fee_deducted have NO shipped code
 *   (they would need new event.* glossary leaves, which are 🟠 deferred) — the
 *   CLI rejects them with the reason instead of silently mislabeling.
 * - The roadmap's renamed accounting.* ids (accounting.deposit_received, …)
 *   are NOT used; events carry their shipped event.* conceptId via
 *   PARTNER_OPS_EVENT_GLOSSARY.
 * - "Real-time balance updates" = append → partners:build (aggregates are
 *   ledger-derived, never hand-maintained).
 */

import { jsonOut, logDepth } from '../lib/console-depth.ts';
import {
  buildPartnerOpsEvent,
  isPartnerOpsEventCode,
  type PartnerOpsEvent,
} from '../lib/telegram/partner-ops-events.ts';
import { appendPartnerOpsEvent } from '../lib/telegram/partner-ops-registry.ts';

/** Domain trigger → shipped event code + required fields. */
export type PartnerEventTrigger = keyof typeof TRIGGERS;

export const TRIGGERS = {
  deposit_received: { code: 'DEPOSIT_RECEIVED', requires: ['amount', 'rail'] },
  deposit_allocated: { code: 'DEPOSIT_ALLOCATED', requires: ['amount', 'out'] },
  credit_extended: { code: 'CREDIT_EXTENDED', requires: ['amount'] },
  free_roll_applied: { code: 'FREE_ROLL_APPLIED', requires: [] },
  settlement_processed: { code: 'SETTLEMENT_PROCESSED', requires: ['amount', 'out'] },
  // No shipped PARTNER_OPS_EVENT_CODE exists for these (event.* concepts are
  // 🟠 deferred) — reject rather than mislabel.
  withdrawal_processed: null,
  credit_repaid: null,
  fee_deducted: null,
} as const satisfies Record<string, { code: string; requires: readonly string[] } | null>;

export function partnerEventTriggerCode(trigger: string): string | null {
  const entry = TRIGGERS[trigger as PartnerEventTrigger];
  return entry?.code ?? null;
}

export type PartnerEventFields = {
  partner?: string;
  call?: string;
  out?: string;
  amount?: number;
  rail?: string;
  note?: string;
};

export function validateTriggerFields(trigger: string, fields: PartnerEventFields): string[] {
  const entry = TRIGGERS[trigger as PartnerEventTrigger];
  if (!entry) return [`unknown trigger "${trigger}"`];
  const errs: string[] = [];
  for (const field of entry.requires) {
    const value = fields[field as keyof PartnerEventFields];
    if (value === undefined || value === null || value === '') {
      errs.push(`trigger ${trigger} requires --${field}`);
    }
  }
  if (fields.amount !== undefined && !Number.isFinite(fields.amount)) {
    errs.push('--amount must be a finite number');
  }
  return errs;
}

export function buildTriggerEvent(trigger: string, fields: PartnerEventFields): PartnerOpsEvent {
  const code = partnerEventTriggerCode(trigger);
  if (!code || !isPartnerOpsEventCode(code)) {
    throw new Error(`trigger "${trigger}" has no shipped event code`);
  }
  return buildPartnerOpsEvent(code as never, {
    partnerCode: fields.partner?.toUpperCase(),
    callSign: fields.call?.toUpperCase(),
    outId: fields.out,
    amount: fields.amount,
    rail: fields.rail,
    note: fields.note,
  });
}

const argv = Bun.argv.slice(2);
const trigger = argv.find(a => !a.startsWith('-'));
const wantJson = argv.includes('--json');
const dryRun = argv.includes('--dry-run');

function flag(name: string): string | undefined {
  const i = argv.indexOf(name);
  if (i < 0) return undefined;
  return argv[i + 1];
}

async function main(): Promise<number> {
  if (!trigger || argv.includes('--help') || argv.includes('-h')) {
    console.log(
      `Usage: partners:event -- <trigger> [--partner CODE] [--call CALL] [--out ID] [--amount N] [--rail R] [--note …] [--dry-run] [--json]\n\n` +
        `Triggers (→ shipped event code):\n` +
        Object.entries(TRIGGERS)
          .map(
            ([name, entry]) =>
              `  ${name} → ${entry ? entry.code : '🟠 unsupported (event concept deferred)'}`
          )
          .join('\n')
    );
    return trigger ? 0 : 2;
  }

  const hasTrigger = Object.hasOwn(TRIGGERS, trigger);
  if (!hasTrigger) {
    console.error(`Unknown trigger "${trigger}" (see partners:event --help)`);
    return 2;
  }

  const entry = TRIGGERS[trigger as PartnerEventTrigger];
  if (entry === null) {
    console.error(
      `Trigger "${trigger}" has no shipped event code — withdrawal/credit-repaid/fee events ` +
        `need new event.* glossary concepts (🟠 deferred). Use the existing codes via ` +
        `partners:ledger:append if applicable.`
    );
    return 2;
  }

  const fields: PartnerEventFields = {
    partner: flag('--partner'),
    call: flag('--call'),
    out: flag('--out'),
    amount: flag('--amount') !== undefined ? Number(flag('--amount')) : undefined,
    rail: flag('--rail'),
    note: flag('--note'),
  };

  if (entry === null) {
    console.error(
      `Trigger "${trigger}" has no shipped event code — withdrawal/credit-repaid/fee events ` +
        `need new event.* glossary concepts (🟠 deferred). Use the existing codes via ` +
        `partners:ledger:append if applicable.`
    );
    return 2;
  }

  const errs = validateTriggerFields(trigger, fields);
  if (errs.length > 0) {
    console.error(errs.map(e => `  ✗ ${e}`).join('\n'));
    return 2;
  }

  const event = buildTriggerEvent(trigger, fields);

  if (dryRun) {
    if (wantJson) jsonOut({ dryRun: true, event });
    else logDepth({ dryRun: true, event });
    return 0;
  }

  const path = await appendPartnerOpsEvent(event);
  if (wantJson) jsonOut({ path, event });
  else logDepth({ path, event, next: 'bun run partners:build' });
  return 0;
}

if (import.meta.main) {
  process.exit(await main());
}
