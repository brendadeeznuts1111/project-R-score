// @see https://bun.com/docs/runtime/cron#bun-cron-path-schedule-title-os-level — scheduled() handler
// scripts/telegram-event-alerts-cron.ts — OS-persistent event alert scanner
// (reboot-surviving, registered via `bun run telegram:event-alerts:cron:register`).
//
// Polls stream-list-v2 every 5 minutes; the first run is a baseline (records
// seen keys, no alerts) so a fresh process never spams the full event set.

import { runEventAlerts } from '../lib/telegram/event-alerts.ts';

export default {
  async scheduled(_controller: Bun.CronController) {
    try {
      const result = await runEventAlerts();
      console.log(
        `telegram event alerts cron: ${result.seen} new · ${result.alerted} alerted · ${result.failed.length} failed${result.firstRun ? ' · baseline' : ''}`
      );
      for (const f of result.failed) console.error(`  ✗ ${f.eventKey}: ${f.error}`);
    } catch (e) {
      console.error(`telegram event alerts cron failed: ${e instanceof Error ? e.message : e}`);
    }
  },
};
