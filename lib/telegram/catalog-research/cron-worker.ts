// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/cron#bun-cron-path-schedule-title-os-level — scheduled() handler
/**
 * OS-persistent daily worker — Reasonix / launchd primary path.
 *
 * Order: load catalog → gather signals → analyzers + LLM → write enhancements JSON
 * Optional: TELEGRAM_CATALOG_RESEARCH_APPLY_SAFE=1 merges safe icon metadata into catalog
 * Optional: TELEGRAM_CATALOG_RESEARCH_TZ=America/New_York for local fire interpretation
 */
import { loadReasonixEnv } from './load-reasonix-env.ts';
import { runCatalogResearchCycle } from './cron.ts';

export default {
  async scheduled(_controller: Bun.CronController) {
    await loadReasonixEnv();

    const result = await runCatalogResearchCycle({
      llm: undefined,
      applySafe: Bun.env.TELEGRAM_CATALOG_RESEARCH_APPLY_SAFE === '1',
    });
    if (result.code !== 0) {
      throw new Error(result.error ?? 'telegram catalog research cycle failed');
    }
  },
};
