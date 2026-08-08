// @see https://bun.com/docs/runtime/cron#bun-cron-path-schedule-title-os-level — scheduled() handler
import { joinPath } from '../lib/path-bun.ts';
import { runThreadResearchCycle } from '../lib/research/thread-improvement.ts';

process.chdir(joinPath(import.meta.dir, '..'));

export default {
  async scheduled(_controller: Bun.CronController) {
    const result = await runThreadResearchCycle({ executeAgents: true });
    console.info(
      `[project-r-thread-research] wrote ${result.reports.length} briefs: ${result.reports.map(report => report.ref).join(', ')}; failures=${result.failures.length}`
    );
    if (result.failures.length > 0) {
      throw new Error(
        `thread research incomplete: ${result.failures.map(failure => failure.ref).join(', ')}`
      );
    }
  },
};
