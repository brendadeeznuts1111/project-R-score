// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/cron#bun-cron-path-schedule-title-os-level — Bun.cron(path, schedule, title)
// tools/ops-anchor-scan-cron.ts — OS-level Bun.cron for the stale-anchor
// scan + bake (primary, reboot-surviving).
//
//   bun run ops:anchor:scan:cron:register   # register (every 15 min, system local)
//   bun run ops:anchor:scan:cron:remove     # remove
//   bun run ops:anchor:scan:cron:preview    # preview next fire times
//
// The worker module (tools/bake-stale-anchors.ts) runs the scan over the
// live limit-tracker history and writes public/registry/stale-anchors.json.
// Analytics signal only — never places bets.
//
// @see docs/harness/tenants/ops-loop-throughput.md — ops cadence

import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { parseCron, registerOsCron, removeOsCron } from '../lib/harness/cron.ts';

export const ANCHOR_SCAN_CRON_WORKER = '/Users/nolarose/Projects/tools/bake-stale-anchors.ts';
export const ANCHOR_SCAN_CRON_TITLE = 'anchor-scan';
export const ANCHOR_SCAN_CRON_SCHEDULE = '*/15 * * * *'; // every 15 minutes

function previewFireTimes(expression: string, count: number, from?: Date | number): Date[] {
  const times: Date[] = [];
  let cursor = from ?? Date.now();
  for (let i = 0; i < count; i++) {
    const next = parseCron(expression, cursor);
    if (!next) break;
    times.push(next);
    cursor = next.getTime() + 1000;
  }
  return times;
}

async function main(): Promise<void> {
  const action = Bun.argv[2] ?? 'preview';

  if (action === 'register') {
    await registerOsCron(
      ANCHOR_SCAN_CRON_WORKER,
      ANCHOR_SCAN_CRON_SCHEDULE,
      ANCHOR_SCAN_CRON_TITLE
    );
    console.log(
      `registered anchor-scan cron: ${ANCHOR_SCAN_CRON_SCHEDULE} → ${ANCHOR_SCAN_CRON_WORKER}`
    );
    return;
  }

  if (action === 'remove') {
    await removeOsCron(ANCHOR_SCAN_CRON_TITLE);
    console.log('removed anchor-scan cron');
    return;
  }

  // preview (default)
  const times = previewFireTimes(ANCHOR_SCAN_CRON_SCHEDULE, 5);
  console.log(
    `anchor-scan cron schedule: ${ANCHOR_SCAN_CRON_SCHEDULE} (${ANCHOR_SCAN_CRON_TITLE})`
  );
  for (const t of times) {
    console.log(`  next → ${t.toISOString()}`);
  }
}

if (isModuleEntrypoint(import.meta)) {
  await main();
}
