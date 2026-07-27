// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Telegram catalog research — OS cron constants.
 *
 * OS-level Bun.cron uses **system local** time (Reasonix Mac = operator TZ).
 * Override: TELEGRAM_CATALOG_RESEARCH_CRON_SCHEDULE · TELEGRAM_CATALOG_RESEARCH_CRON_TITLE
 */
export const TELEGRAM_CATALOG_RESEARCH_CRON_TITLE = 'telegram-catalog-research';

/** Default 07:00 daily (local). */
export const TELEGRAM_CATALOG_RESEARCH_CRON_SCHEDULE = '0 7 * * *';

export function resolveCatalogResearchCronSchedule(): string {
  return (
    Bun.env.TELEGRAM_CATALOG_RESEARCH_CRON_SCHEDULE?.trim() ||
    TELEGRAM_CATALOG_RESEARCH_CRON_SCHEDULE
  );
}

export function resolveCatalogResearchCronTitle(): string {
  return (
    Bun.env.TELEGRAM_CATALOG_RESEARCH_CRON_TITLE?.trim() || TELEGRAM_CATALOG_RESEARCH_CRON_TITLE
  );
}
