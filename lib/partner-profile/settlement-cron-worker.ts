// @see https://bun.com/docs/runtime/cron#bun-cron-path-schedule-title-os-level — scheduled() handler
// lib/partner-profile/settlement-cron-worker.ts — OS-persistent weekly
// settlement runner (reboot-surviving, registered via
// `bun run partner:settlement:cron:register`).
//
// Runs the weekly settlement sweep: for every partner profile with
// settlement.commissionPct set, posts the period's commission adjustment
// (idempotent per `period-<weekStart>` reference) and refreshes fundStatus
// via the margin rules. The in-process complement (`--cron` on
// partner:settlement:run) shares this module's logic.
//
// @see docs/design/settlement-feed.md — cron cadence

import { runSettlementsForAll, startOfWeek } from './settlement-runner';

export default {
  async scheduled(_controller: Bun.CronController) {
    try {
      const result = await runSettlementsForAll({ periodStart: startOfWeek() });
      console.log(
        `settlement cron: ${result.results.length} settled · ${result.skippedPartners.length} no-commission · ${result.failed.length} failed`
      );
      for (const f of result.failed) console.error(`  ✗ ${f.code}: ${f.error}`);
    } catch (e) {
      // Keep the daemon running — a failed sweep must not kill the cron loop.
      console.error(`settlement cron failed: ${e instanceof Error ? e.message : e}`);
    }
  },
};
