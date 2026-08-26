import { describe, expect, it } from 'bun:test';
import {
  createFactoryR2Authority,
  fetchFactoryR2,
  type FactoryR2Authority,
  type FactoryR2ExecutionOptions,
} from './r2-outbound.ts';
import type { OutboundFetch } from '../../../../../../../lib/http/outbound-policy.ts';

const ACCOUNT = '7a470541a704caaf91e71efccc78fd36';
const ORIGIN = `https://${ACCOUNT}.r2.cloudflarestorage.com`;
const authority = createFactoryR2Authority(ACCOUNT, ORIGIN);
const publicResolver = async () => [
  { address: '104.16.1.1', family: 4 as const, ttl: 60, source: 'node-resolver' as const },
];

function execution(fetcher: OutboundFetch): FactoryR2ExecutionOptions {
  return { fetcher, resolver: publicResolver, environment: {} };
}

function call(
  init: BunFetchRequestInit = {},
  options: FactoryR2ExecutionOptions = execution(async () => new Response('ok')),
  key = 'packages/example/manifest.json'
): Promise<Response> {
  return fetchFactoryR2(authority, { bucket: 'npm-registry', key, init }, options);
}

describe('factory registry R2 outbound boundary', () => {
  it('binds the endpoint to the canonical account authority', () => {
    expect(() => createFactoryR2Authority('short')).toThrow('32-character account id');
    expect(() => createFactoryR2Authority(ACCOUNT, 'http://example.com')).toThrow(
      'canonical account origin'
    );
    expect(() => createFactoryR2Authority(ACCOUNT, `${ORIGIN}/objects`)).toThrow(
      'canonical account origin'
    );
    expect(() =>
      fetchFactoryR2(
        { accountId: ACCOUNT, origin: 'https://example.com' } as FactoryR2Authority,
        { bucket: 'npm-registry' },
        execution(async () => new Response('never'))
      )
    ).toThrow('canonical account origin');
  });

  it('builds a bounded account, bucket, key, and query request', async () => {
    let capturedUrl = '';
    let capturedInit: BunFetchRequestInit | undefined;
    const response = await fetchFactoryR2(
      authority,
      {
        bucket: 'npm-registry',
        key: 'packages/@scope%2fname/manifest.json',
        query: { 'list-type': '2', prefix: 'packages/@scope/' },
        init: { headers: { Authorization: 'Basic scoped' } },
      },
      execution(async (input, init) => {
        capturedUrl = input.toString();
        capturedInit = init;
        return new Response('ok');
      })
    );
    expect(response.status).toBe(200);
    expect(capturedUrl).toBe(
      `${ORIGIN}/npm-registry/packages/@scope%2fname/manifest.json?list-type=2&prefix=packages%2F%40scope%2F`
    );
    expect(capturedInit?.credentials).toBe('omit');
    expect(capturedInit?.redirect).toBe('error');
    expect(capturedInit?.signal).toBeInstanceOf(AbortSignal);
  });

  it('denies alternate paths, methods, credentials, and redirects before fetch', async () => {
    let effects = 0;
    const guarded = execution(async () => {
      effects++;
      return new Response('never');
    });
    expect(() => call({}, guarded, '../secret')).toThrow('object key is invalid');
    expect(() => call({}, guarded, '%2e%2e/secret')).toThrow('object key is invalid');
    expect(() => call({}, guarded, 'manifest.json?admin=true')).toThrow('object key is invalid');
    expect(() =>
      fetchFactoryR2(authority, { bucket: 'Bad_Bucket', init: {} }, guarded)
    ).toThrow('bucket is invalid');
    expect(() => call({ method: 'POST' }, guarded)).toThrow('method POST');
    expect(() => call({ headers: { Cookie: 'ambient=1' } }, guarded)).toThrow(
      'credentials are forbidden'
    );
    expect(() => call({ redirect: 'follow' }, guarded)).toThrow('redirect mode');
    expect(effects).toBe(0);
  });

  it('denies proxy, TLS, protocol, and offline overrides before fetch', async () => {
    let effects = 0;
    const guarded = execution(async () => {
      effects++;
      return new Response('never');
    });
    expect(() => call({ proxy: 'http://proxy.test' }, guarded)).toThrow('proxy cannot override');
    expect(() => call({ tls: { rejectUnauthorized: false } }, guarded)).toThrow(
      'Outbound request extension is denied'
    );
    expect(() => call({ protocol: 'http3' } as unknown as BunFetchRequestInit, guarded)).toThrow(
      'protocol h3 is not allowed'
    );
    expect(() => call({}, { ...guarded, networkMode: 'offline-no-socket' })).toThrow(
      'forbids network fetch'
    );
    expect(effects).toBe(0);
  });

  it('bounds response bytes', async () => {
    await expect(
      call({}, execution(async () => new Response('x', { headers: { 'content-length': '9000000' } })))
    ).rejects.toThrow('exceeds 8388608 bytes');
  });
});
