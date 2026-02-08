import { describe, expect, test } from 'bun:test';
import { storeCookieTelemetry } from '../scripts/lib/cookie-telemetry';

describe('storeCookieTelemetry', () => {
  test('writes secure domain and subdomain telemetry payloads', async () => {
    const puts = new Map<string, string>();
    const bucket = {
      put(key: string, value: string) {
        puts.set(key, value);
      },
    };

    const cookies = new Map<string, string>([
      ['session', 'abc'],
      ['csrf', 'def'],
    ]);

    await storeCookieTelemetry('api.shop.factory-wager.com', cookies, bucket, 1700000000000);

    const ctx = JSON.parse(puts.get('cookies/api.shop.factory-wager.com/secure_domain_ctx') || '{}');
    const state = JSON.parse(puts.get('cookies/api.shop.factory-wager.com/secure_subdomain_state') || '{}');
    const payload = JSON.parse(puts.get('cookies/api.shop.factory-wager.com/latest_payload') || '{}');

    expect(ctx.secure).toBe(true);
    expect(ctx.httpOnly).toBe(true);
    expect(ctx.sameSite).toBe('strict');
    expect(state.active).toBe(true);
    expect(Array.isArray(state.subdomains)).toBe(true);
    expect(state.subdomains).toEqual(['api', 'shop']);
    expect(payload.cookies).toBe(2);
    expect(payload.keys).toEqual(['session', 'csrf']);
    expect(payload.timestamp).toBe(1700000000000);
  });
});
