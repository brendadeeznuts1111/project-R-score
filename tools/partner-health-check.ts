// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// tools/partner-health-check.ts — per-out balance & connectivity health checks.
//
//   bun run partner:health-check                  # all outs from the desk snapshot
//   bun run partner:health-check -- --min-balance=500
//   bun run partner:health-check -- --out=OUT-1 --partner=SPEN
//   bun run partner:health-check -- --alert       # also notify the ops chat
//   bun run partner:health-check -- --json
//
// Exit 1 when any out is degraded (offline / low balance).

import { colorize, jsonOut, logTable } from '../lib/console-depth.ts';
import { loadTelegramEnv } from '../lib/telegram/telegram-config.ts';
import { runOutHealthChecks } from '../lib/telegram/out-health.ts';
import { alertOpsOnDegraded } from '../lib/telegram/out-health.ts';
import { buildSeatCapitalDeskSnapshot } from '../lib/telegram/seat-desk-snapshot.ts';

function argValue(argv: readonly string[], flag: string): string | undefined {
  const eq = argv.find(a => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const i = argv.indexOf(flag);
  if (i !== -1) return argv[i + 1];
  return undefined;
}

const minBalanceRaw = argValue(Bun.argv, '--min-balance');
const minBalance =
  minBalanceRaw === undefined ? undefined : Number.parseFloat(minBalanceRaw) || undefined;
const outFilter = argValue(Bun.argv, '--out');
const partnerFilter = argValue(Bun.argv, '--partner');
const doAlert = Bun.argv.includes('--alert');
const asJson = Bun.argv.includes('--json');

const snapshot = await buildSeatCapitalDeskSnapshot();
const report = runOutHealthChecks({ snapshot, minBalance, outFilter, partnerFilter });

if (asJson) {
  jsonOut(report);
} else {
  logTable(
    [{ checked: report.checked, ok: report.ok, degraded: report.degraded.length }],
    ['checked', 'ok', 'degraded']
  );
  for (const d of report.degraded) {
    console.error(
      colorize(
        `  ✗ ${d.outNum} (${d.partnerCode} · ${d.book}) — ${d.status}: ${d.reason}`,
        d.status === 'offline' ? '#f85149' : '#d29922'
      )
    );
  }
  if (report.degraded.length === 0) {
    console.log(colorize(`partner:health-check · all ${report.checked} out(s) OK`, '#3fb950'));
  }
}

if (doAlert && report.degraded.length > 0) {
  const env = loadTelegramEnv();
  const token = env.effectiveToken;
  const chatId = env.opsChatId;
  if (token && chatId) {
    const { sent } = await alertOpsOnDegraded({ token, chatId, report });
    console.log(
      colorize(sent ? 'ops alert sent' : 'ops alert FAILED', sent ? '#3fb950' : '#f85149')
    );
  } else {
    console.error(
      colorize('ops alert skipped — TELEGRAM_BOT_FACTORY / TELEGRAM_OPS_CHAT_ID not set', '#8b949e')
    );
  }
}

if (report.degraded.length > 0) process.exit(1);
