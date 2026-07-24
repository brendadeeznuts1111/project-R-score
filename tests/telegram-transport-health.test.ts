/**
 * Telegram transport health (env-only, no live probe).
 */
import { describe, expect, test } from 'bun:test';
import { queryTelegramTransportHealth } from '../lib/telegram/telegram-transport-health.ts';

describe('telegram transport health', () => {
  test('reports missing token when env empty', async () => {
    const prevFactory = Bun.env.TELEGRAM_BOT_FACTORY;
    const prevLegacy = Bun.env.TELEGRAM_BOT_TOKEN;
    delete Bun.env.TELEGRAM_BOT_FACTORY;
    delete Bun.env.TELEGRAM_BOT_TOKEN;

    try {
      const health = await queryTelegramTransportHealth({ probe: false });
      expect(health.ready).toBe(false);
      expect(health.missing).toContain('TELEGRAM_BOT_FACTORY or TELEGRAM_BOT_TOKEN');
      expect(health.recommendations.length).toBeGreaterThan(0);
    } finally {
      if (prevFactory !== undefined) Bun.env.TELEGRAM_BOT_FACTORY = prevFactory;
      if (prevLegacy !== undefined) Bun.env.TELEGRAM_BOT_TOKEN = prevLegacy;
    }
  });
});
