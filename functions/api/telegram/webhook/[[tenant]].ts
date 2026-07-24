/**
 * Pages edge webhook — enqueue Telegram updates to R2 for Bun consumer.
 *
 * Edge-safe (no bun:sqlite). Full command handling runs on Bun via
 * `bun run telegram:ops:consume`.
 *
 * @see lib/telegram/webhook-pages.ts
 * @see docs/harness/tenants/telegram-factory.md
 */
import { onTelegramWebhookRequest } from '../../../../lib/telegram/webhook-pages.ts';
import type { PagesContext } from '../../../../lib/pages/pages-function.ts';

export async function onRequest(context: PagesContext): Promise<Response> {
  return onTelegramWebhookRequest(context);
}
