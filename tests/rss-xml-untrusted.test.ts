// @see https://bun.com/docs/runtime/workers#creating-a-worker — Worker messages
// @see https://bun.com/docs/runtime/workers#terminating-a-worker — termination
// @see https://bun.com/reference/bun/XML/parse — Bun.XML.parse byte inputs

import { describe, expect, test } from 'bun:test';
import {
  parseRSSFeedUntrusted,
  parseRSSFeedWithWorkerFactoryForTest,
  parseRssChannelItemsUntrusted,
  type RSSXmlWorkerFactory,
} from '../lib/rss/rss-xml-untrusted.ts';

const FEED = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>
<title>Updates</title><link>https://example.test/</link><description>News</description>
<item><title>One</title><link>https://example.test/one</link><description>Text</description>
<guid>https://example.test/one</guid><pubDate>Mon, 24 Aug 2026 20:42:00 GMT</pubDate></item>
</channel></rss>`;

function utf16Le(text: string): Uint8Array {
  const output = new Uint8Array(2 + text.length * 2);
  output[0] = 0xff;
  output[1] = 0xfe;
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    output[2 + index * 2] = code & 0xff;
    output[3 + index * 2] = code >>> 8;
  }
  return output;
}

function actualWorkerFactory(relativeUrl: string): RSSXmlWorkerFactory {
  return () => new Worker(new URL(relativeUrl, import.meta.url), { type: 'module', smol: true });
}

describe('terminable untrusted RSS XML boundary', () => {
  test('returns deterministic values for valid UTF-8 and UTF-16 byte feeds', async () => {
    const utf8 = new TextEncoder().encode(FEED);
    const first = await parseRSSFeedUntrusted(utf8);
    const second = await parseRSSFeedUntrusted(utf8);
    expect(first).toEqual(second);
    expect(first.ok && first.value.items[0]?.title).toBe('One');
    // The boundary transfers its own bounded copy, never the caller's buffer.
    expect(utf8.byteLength).toBeGreaterThan(0);

    const utf16 = utf16Le(FEED.replace('encoding="UTF-8"', 'encoding="UTF-16"'));
    const parsed = await parseRSSFeedUntrusted(utf16);
    expect(parsed.ok && parsed.value.title).toBe('Updates');
  });

  test('shares the worker boundary with strict Bun channel item extraction', async () => {
    const result = await parseRssChannelItemsUntrusted(FEED);
    expect(result).toEqual({
      ok: true,
      value: [
        {
          title: 'One',
          link: 'https://example.test/one',
          guid: 'https://example.test/one',
          pubDate: 'Mon, 24 Aug 2026 20:42:00 GMT',
          description: 'Text',
        },
      ],
    });
  });

  test('fails closed with structured malformed, DTD, and quota errors', async () => {
    const malformed = await parseRSSFeedUntrusted('<rss><channel></rss>');
    expect(malformed.ok).toBeFalse();
    expect(!malformed.ok && malformed.error.code).toBe('parse-rejected');
    expect(!malformed.ok && malformed.error.name).toBe('SyntaxError');

    const dtd = await parseRSSFeedUntrusted(`<!DOCTYPE rss>${FEED}`);
    expect(dtd.ok).toBeFalse();
    expect(!dtd.ok && dtd.error.message).toContain('DOCTYPE or entity declaration');

    const quota = await parseRSSFeedUntrusted(FEED, { quotas: { maxInputBytes: 32 } });
    expect(quota).toEqual({
      ok: false,
      error: {
        code: 'invalid-input',
        name: 'RangeError',
        message: 'RSS XML input exceeds 32 byte quota',
      },
    });

    const shapeQuota = await parseRSSFeedUntrusted(FEED, { quotas: { maxNodes: 4 } });
    expect(shapeQuota.ok).toBeFalse();
    expect(!shapeQuota.ok && shapeQuota.error.message).toContain('node quota');
  });

  test('turns an actual worker startup crash into a deterministic envelope', async () => {
    const result = await parseRSSFeedWithWorkerFactoryForTest(
      FEED,
      { deadlineMs: 1_000 },
      actualWorkerFactory('./fixtures/rss-xml-worker-crash.ts')
    );
    expect(result.ok).toBeFalse();
    expect(!result.ok && result.error.code).toBe('worker-failure');
    expect(!result.ok && result.error.message).toContain('intentional RSS XML worker crash');
  });

  test('terminates an intentionally CPU-hung worker at the exact deadline', async () => {
    const started = performance.now();
    const result = await parseRSSFeedWithWorkerFactoryForTest(
      FEED,
      { deadlineMs: 50 },
      actualWorkerFactory('./fixtures/rss-xml-worker-hang.ts')
    );
    const elapsed = performance.now() - started;
    expect(result).toEqual({
      ok: false,
      error: {
        code: 'deadline-exceeded',
        name: 'TimeoutError',
        message: 'RSS XML parse exceeded 50ms deadline',
      },
    });
    expect(elapsed).toBeGreaterThanOrEqual(40);
    expect(elapsed).toBeLessThan(1_000);
  });

  test('unrefs and terminates exactly once on every settled path', async () => {
    for (const response of [
      { protocol: 'factorywager-rss-xml-worker-v1', ok: true, value: { title: 'fake' } },
      {
        protocol: 'factorywager-rss-xml-worker-v1',
        ok: false,
        error: { name: 'SyntaxError', message: 'fake rejection' },
      },
      { unexpected: true },
    ]) {
      const state = { unref: 0, terminate: 0 };
      const target = new EventTarget();
      const factory = (() => ({
        addEventListener: target.addEventListener.bind(target),
        removeEventListener: target.removeEventListener.bind(target),
        unref: () => state.unref++,
        terminate: () => state.terminate++,
        postMessage: () =>
          queueMicrotask(() =>
            target.dispatchEvent(new MessageEvent('message', { data: response }))
          ),
      })) satisfies RSSXmlWorkerFactory;
      await parseRSSFeedWithWorkerFactoryForTest(FEED, { deadlineMs: 1_000 }, factory);
      expect(state).toEqual({ unref: 1, terminate: 1 });
    }

    const state = { unref: 0, terminate: 0 };
    const target = new EventTarget();
    const silentFactory = (() => ({
      addEventListener: target.addEventListener.bind(target),
      removeEventListener: target.removeEventListener.bind(target),
      unref: () => state.unref++,
      terminate: () => state.terminate++,
      postMessage: () => {},
    })) satisfies RSSXmlWorkerFactory;
    await parseRSSFeedWithWorkerFactoryForTest(FEED, { deadlineMs: 10 }, silentFactory);
    expect(state).toEqual({ unref: 1, terminate: 1 });
  });

  test('worker parser has no network or ambient-environment input channel', async () => {
    const source = await Bun.file(
      new URL('../lib/rss/rss-xml-worker.ts', import.meta.url)
    ).text();
    expect(source).not.toMatch(/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/);
    expect(source).not.toMatch(/\b(?:Bun|process)\.env\b/);
  });

  test('all network-backed RSS consumers select the terminable boundary', async () => {
    for (const [relativePath, boundary] of [
      ['../lib/rss/rss-manager.ts', 'parseRSSFeedUntrusted'],
      ['../lib/verification/bun-channel-doctor.ts', 'parseRssChannelItemsUntrusted'],
      ['../tools/bun-docs-releases.ts', 'parseRssChannelItemsUntrusted'],
      ['../tools/bun-docs-mcp-lib.ts', 'parseRssChannelItemsUntrusted'],
      ['../packages/bun-release-contracts/src/feed.ts', 'parseRssChannelItemsUntrusted'],
    ] as const) {
      const source = await Bun.file(new URL(relativePath, import.meta.url)).text();
      expect(source).toContain(boundary);
    }
  });
});
