import { describe, expect, test } from 'bun:test';
import type { OutboundFetch } from '../../../../../lib/http/outbound-policy';
import {
  fetchWebhookEndpoint,
  parseWebhookEndpoint,
  validateWebhookEndpointConfig,
} from '../../src/utils/webhook-endpoints';

const baseConfig = {
  url: 'https://hooks.example.com/events',
  method: 'POST',
  headers: { Authorization: 'Bearer hidden', 'Content-Type': 'application/json' },
  timeoutMs: 5_000,
};

describe('webhook outbound endpoints', () => {
  test('accepts HTTPS and normalized loopback development URLs', () => {
    expect(parseWebhookEndpoint('https://hooks.example.com/events').origin).toBe(
      'https://hooks.example.com'
    );
    expect(parseWebhookEndpoint('http://[::1]:3001/events').hostname).toBe('[::1]');
    expect(parseWebhookEndpoint('http://127.1:3001/events').hostname).toBe('127.0.0.1');
  });

  test('rejects insecure external, credential-bearing, and fragmented URLs', () => {
    expect(() => parseWebhookEndpoint('http://hooks.example.com/events')).toThrow('HTTPS');
    expect(() => parseWebhookEndpoint('https://user:pass@hooks.example.com/events')).toThrow(
      'credentials'
    );
    expect(() => parseWebhookEndpoint('https://hooks.example.com/events#secret')).toThrow(
      'fragment'
    );
  });

  test('rejects unsupported methods, authority headers, and invalid deadlines', () => {
    expect(() => validateWebhookEndpointConfig({ ...baseConfig, method: 'TRACE' })).toThrow(
      'not supported'
    );
    expect(() =>
      validateWebhookEndpointConfig({ ...baseConfig, headers: { Host: 'internal.example' } })
    ).toThrow('transport authority');
    expect(() => validateWebhookEndpointConfig({ ...baseConfig, timeoutMs: 30_001 })).toThrow(
      'timeoutMs'
    );
  });

  test('binds credentials to the registered origin and forbids redirects', async () => {
    let observedUrl = '';
    let observedInit: RequestInit | undefined;
    const fetcher = ((input: string | URL, init?: RequestInit) => {
      observedUrl = input.toString();
      observedInit = init;
      return Promise.resolve(new Response(null, { status: 204 }));
    }) as OutboundFetch;

    const response = await fetchWebhookEndpoint(baseConfig, { body: '{}' }, fetcher);
    expect(response.status).toBe(204);
    expect(observedUrl).toBe(baseConfig.url);
    expect(observedInit?.redirect).toBe('error');
    expect(observedInit?.credentials).toBe('omit');
    expect(observedInit?.signal).toBeInstanceOf(AbortSignal);
    expect(new Headers(observedInit?.headers).get('authorization')).toBe('Bearer hidden');
  });
});
