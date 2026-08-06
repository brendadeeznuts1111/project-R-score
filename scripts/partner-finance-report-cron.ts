// @see https://bun.com/docs/runtime/cron#bun-cron-path-schedule-title-os-level — scheduled() handler
// scripts/partner-finance-report-cron.ts — OS-persistent daily finance report
// (reboot-surviving, registered via `bun run partner:finance-report:cron:register`).

import { runDailyFinanceReport } from '../lib/telegram/daily-finance-report.ts';

export default {
  async scheduled(_controller: Bun.CronController) {
    try {
      const result = await runDailyFinanceReport({ days: 7 });
      console.log(
        `partner finance report cron: ${result.sent} sent · ${result.skipped.length} skipped · ${result.failed.length} failed · ${result.partners} partners`
      );
      for (const f of result.failed) console.error(`  ✗ ${f.partnerCode}: ${f.error}`);
    } catch (e) {
      console.error(`partner finance report cron failed: ${e instanceof Error ? e.message : e}`);
    }
  },
};
