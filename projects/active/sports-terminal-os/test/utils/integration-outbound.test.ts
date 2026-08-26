import { describe, expect, test } from 'bun:test';
import type { OutboundFetch } from '../../../../../lib/http/outbound-policy';
import {
  fetchKimiRisk,
  fetchPartnerSourceHealth,
  fetchPinnacleOddsEndpoint,
  fetchTelegramBotApi,
  parsePartnerSourceEndpoint,
} from '../../src/utils/integration-outbound';

const publicResolver = async () => [
  { address: '1.1.1.1', family: 4 as const, ttl: 30, source: 'bun' as const },
];

function recordingFetcher(records: Array<{ url: string; init?: BunFetchRequestInit }>): OutboundFetch {
  return (input, init) => {
    records.push({ url: input.toString(), init });
    return Promise.resolve(new Response('{}', { status: 200 }));
  };
}

describe('Sports Terminal integration outbound authority', () => {
  test('binds Kimi credentials to the exact Moonshot origin', async () => {
    const records: Array<{ url: string; init?: BunFetchRequestInit }> = [];
    await fetchKimiRisk(
      { method: 'POST', headers: { Authorization: 'Bearer hidden' }, body: '{}' },
      { fetcher: recordingFetcher(records), resolver: publicResolver, environment: {} }
    );
    expect(records[0]?.url).toBe('https://api.moonshot.cn/v1/chat/completions');
    expect(records[0]?.init?.redirect).toBe('error');
    expect(records[0]?.init?.credentials).toBe('omit');

    expect(() =>
      fetchPinnacleOddsEndpoint(
        'https://api.pinnacle.com.evil.test/v1/odds',
        { headers: { Authorization: 'Bearer hidden' } },
        { fetcher: recordingFetcher(records) }
      )
    ).toThrow('origin');
  });

  test('pins Telegram to H2 and never authorizes a malformed token or method', async () => {
    const records: Array<{ url: string; init?: BunFetchRequestInit }> = [];
    await fetchTelegramBotApi(
      '123456:ABC_def-ghi',
      'sendMessage',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
      { fetcher: recordingFetcher(records), resolver: publicResolver, environment: {} }
    );
    expect(records[0]?.url).toBe('https://api.telegram.org/bot123456:ABC_def-ghi/sendMessage');
    expect(records[0]?.init?.protocol).toBe('http2');
    expect(() =>
      fetchTelegramBotApi('../token', 'sendMessage', { method: 'POST' })
    ).toThrow('token');
    expect(() =>
      fetchTelegramBotApi('123456:ABC', '../getMe', { method: 'POST' })
    ).toThrow('method');
  });

  test('validates dynamic partner authorities and rejects SSRF addresses', async () => {
    expect(parsePartnerSourceEndpoint('https://feeds.partner.test/health').origin).toBe(
      'https://feeds.partner.test'
    );
    expect(() => parsePartnerSourceEndpoint('http://169.254.169.254/latest/meta-data')).toThrow(
      'HTTPS'
    );
    expect(() => parsePartnerSourceEndpoint('https://user:pass@feeds.partner.test')).toThrow(
      'credentials'
    );

    await expect(
      fetchPartnerSourceHealth('https://feeds.partner.test/health', {
        fetcher: () => Promise.resolve(new Response(null, { status: 204 })),
        environment: {},
        resolver: async () => [
          { address: '10.0.0.8', family: 4, ttl: 30, source: 'bun' },
        ],
      })
    ).rejects.toThrow();
  });

  test('blocks ambient proxy drift on direct integrations', () => {
    expect(() =>
      fetchKimiRisk(
        { method: 'POST', headers: { Authorization: 'Bearer hidden' }, body: '{}' },
        {
          fetcher: () => Promise.resolve(new Response('{}')),
          resolver: publicResolver,
          environment: { HTTPS_PROXY: 'https://proxy.example.test' },
        }
      )
    ).toThrow('active proxy');
  });
});
