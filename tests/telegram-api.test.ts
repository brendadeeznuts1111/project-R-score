/**
 * Telegram Bot API — rate limit + topics config.
 */
import { describe, expect, test, beforeEach } from 'bun:test';
import {
  parseTelegramTopics,
  threadIdForOutboxTopic,
} from '../lib/telegram/telegram-config.ts';
import {
  resetTelegramRateLimiters,
  sendTelegramBotMessage,
} from '../lib/telegram/telegram-api.ts';

describe('telegram-config', () => {
  test('parseTelegramTopics accepts JSON map', () => {
    expect(parseTelegramTopics('{"ops":2,"alerts":5}')).toEqual({ ops: 2, alerts: 5 });
    expect(parseTelegramTopics('')).toEqual({});
    expect(parseTelegramTopics('not-json')).toEqual({});
  });

  test('threadIdForOutboxTopic maps outbox topic to forum thread', () => {
    const topics = { ops: 2, alerts: 5, toc: 8 };
    expect(threadIdForOutboxTopic(topics, 'plays')).toBe(2);
    expect(threadIdForOutboxTopic(topics, 'alerts')).toBe(5);
    expect(threadIdForOutboxTopic(topics, 'toc')).toBe(8);
    expect(threadIdForOutboxTopic(topics, 'identity', 'partner.welcome')).toBeUndefined();
  });
});

describe('telegram-api rate limit', () => {
  beforeEach(() => {
    resetTelegramRateLimiters();
  });

  test('sendTelegramBotMessage includes message_thread_id when set', async () => {
    const bodies: Record<string, unknown>[] = [];
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async (_input: RequestInfo, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response(JSON.stringify({ ok: true, result: { message_id: 99 } }), {
        status: 200,
      });
    }) as typeof fetch;

    try {
      const result = await sendTelegramBotMessage('test-token-1234567890', {
        chatId: '-100123',
        text: 'hello',
        messageThreadId: 7,
      });
      expect(result.ok).toBe(true);
      expect(result.messageId).toBe(99);
      expect(bodies[0]?.message_thread_id).toBe(7);
    } finally {
      globalThis.fetch = origFetch;
      resetTelegramRateLimiters();
    }
  });

  test('retries once on 429 with retry_after', async () => {
    let calls = 0;
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      calls++;
      if (calls === 1) {
        return new Response(
          JSON.stringify({
            ok: false,
            error_code: 429,
            description: 'Too Many Requests',
            parameters: { retry_after: 0 },
          }),
          { status: 429 }
        );
      }
      return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), {
        status: 200,
      });
    }) as typeof fetch;

    try {
      const result = await sendTelegramBotMessage('retry-token-123456789', {
        chatId: '42',
        text: 'retry me',
      });
      expect(result.ok).toBe(true);
      expect(result.retriedAfter429).toBe(true);
      expect(calls).toBe(2);
    } finally {
      globalThis.fetch = origFetch;
      resetTelegramRateLimiters();
    }
  });
});
