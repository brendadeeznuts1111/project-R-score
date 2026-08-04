// @see https://bun.com/docs/runtime/cron#bun-cron-path-schedule-title-os-level — scheduled() handler
// scripts/telegram-daily-report-cron.ts — OS-persistent daily capacity report
// (reboot-surviving, registered via `bun run telegram:daily-report:cron:register`).
//
// Publishes the seat-capital desk daily capacity report to every opted-in
// partner's `liquidity/outs` forum topic and records deliveries in the ops DB
// so partners can acknowledge them via the inline button (`nf:daily:ack`).

import { runDailyCapacityReport } from '../lib/telegram/daily-capacity-report.ts';

export default {
  async scheduled(_controller: Bun.CronController) {
    try {
      const result = await runDailyCapacityReport();
      console.log(
        `telegram daily report cron: ${result.sent} sent · ${result.skipped.length} skipped · ${result.failed.length} failed · ${result.desks} desks`
      );
      for (const f of result.failed) console.error(`  ✗ ${f.partnerCode}: ${f.error}`);
    } catch (e) {
      // Keep the daemon running — a failed report must not kill the cron loop.
      console.error(`telegram daily report cron failed: ${e instanceof Error ? e.message : e}`);
    }
  },
};
