import { describe, expect, test } from 'bun:test';
import { isPublicRemoteAddress } from '../lib/rss/remote-address.ts';
import { fetchWithRedirectPolicy } from '../lib/rss/remote-fetch.ts';
import { fetchPinnedHttps, resolvePublicRemoteAddresses } from '../lib/rss/remote-transport.ts';

const signal = () => AbortSignal.timeout(1000);
const fetcher = (handler: (url: string, init?: BunFetchRequestInit) => Promise<Response>) =>
  Object.assign(handler, { preconnect() {} }) as typeof fetch;

describe('RSS pinned remote transport', () => {
  test.skipIf(!Bun.which('openssl'))(
    'Bun 1.4.3 verifies TLS identity on an IP URL and bypasses ambient proxies',
    async () => {
      // Child isolation avoids modifying proxy settings observed by concurrent test files.
      const child = Bun.spawn(
        [
          process.execPath,
          '--eval',
          String.raw`
      const generated = Bun.spawnSync(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-keyout','/dev/stdout','-out','/dev/stdout','-days','2','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost']);
      if (generated.exitCode !== 0) throw new Error('TLS fixture generation failed');
      const pem = generated.stdout.toString();
      const key = pem.match(/-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/)?.[0];
      const cert = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/)?.[0];
      if (!key || !cert) throw new Error('Invalid generated TLS fixture');
      let proxyCalls=0;
      const proxy=Bun.serve({hostname:'127.0.0.1',port:0,fetch(){proxyCalls++;return new Response('unexpected proxy',{status:502});}});
      const server=Bun.serve({hostname:'127.0.0.1',port:0,tls:{key,cert},fetch:req=>new Response(req.headers.get('host'))});
      process.env.HTTPS_PROXY='http://127.0.0.1:'+proxy.port;
      process.env.https_proxy=process.env.HTTPS_PROXY;
      process.env.NO_PROXY='';process.env.no_proxy='';
      try {
        const url='https://127.0.0.1:'+server.port+'/';
        const response=await fetch(url,{headers:{Host:'localhost'},tls:{ca:cert,serverName:'localhost',servername:'localhost',rejectUnauthorized:true},proxy:false,keepalive:false});
        const host=await response.text();
        let rejected=false;
        try {await fetch(url,{headers:{Host:'localhost'},tls:{ca:cert,rejectUnauthorized:true},proxy:false,keepalive:false});}catch{rejected=true;}
        console.log(JSON.stringify({status:response.status,host,proxyCalls,rejected}));
      } finally {await server.stop(true);await proxy.stop(true);}
    `,
        ],
        { stdout: 'pipe', stderr: 'pipe' }
      );
      const [output, errors, exitCode] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited,
      ]);
      expect(errors).toBe('');
      expect(exitCode).toBe(0);
      expect(JSON.parse(output)).toEqual({
        status: 200,
        host: 'localhost',
        proxyCalls: 0,
        rejected: true,
      });
    }
  );

  for (const address of [
    '127.0.0.1',
    '10.0.0.1',
    '169.254.169.254',
    '::1',
    '::ffff:127.0.0.1',
    'fec0::1',
    '64:ff9b::7f00:1',
    '2002:7f00:1::',
    '2001::1',
  ]) {
    test(`rejects nonpublic DNS address ${address}`, () => {
      expect(isPublicRemoteAddress(address)).toBe(false);
    });
  }

  test('rejects empty, malformed, family-mismatched and mixed public/private answer sets', async () => {
    for (const addresses of [
      [],
      [{ address: 'garbage', family: 4 }],
      [{ address: '8.8.8.8', family: 6 }],
      [
        { address: '8.8.8.8', family: 4 },
        { address: '127.0.0.1', family: 4 },
      ],
    ]) {
      await expect(
        resolvePublicRemoteAddresses('feed.example', signal(), async () => addresses)
      ).rejects.toThrow('prohibited or invalid');
    }
  });

  test('resolves once and pins the approved address rather than a second DNS answer', async () => {
    let resolutions = 0;
    const requests: Array<{ url: string; init?: BunFetchRequestInit }> = [];
    const result = await fetchPinnedHttps(
      new URL('https://feed.example/feed?q=1'),
      new Headers({ Host: 'unsafe.example' }),
      signal(),
      async () => {
        resolutions++;
        return [{ address: resolutions === 1 ? '8.8.8.8' : '127.0.0.1', family: 4 }];
      },
      fetcher(async (url, init) => {
        requests.push({ url, init });
        return new Response('ok');
      })
    );
    expect(await result.text()).toBe('ok');
    expect(resolutions).toBe(1);
    expect(requests[0]?.url).toBe('https://8.8.8.8/feed?q=1');
    expect(new Headers(requests[0]?.init?.headers).get('host')).toBe('feed.example');
    expect(requests[0]?.init).toMatchObject({
      redirect: 'manual',
      proxy: false,
      keepalive: false,
      tls: { serverName: 'feed.example', servername: 'feed.example', rejectUnauthorized: true },
    });
  });

  test('pins IPv6 and preserves the original hostname as TLS identity', async () => {
    let target = '';
    await fetchPinnedHttps(
      new URL('https://feed.example/a'),
      new Headers(),
      signal(),
      async () => [{ address: '2606:4700:4700::1111', family: 6 }],
      fetcher(async url => {
        target = url;
        return new Response('ok');
      })
    );
    expect(target).toBe('https://[2606:4700:4700::1111]/a');
  });

  test('preserves double-slash paths and encoded query data while pinning', async () => {
    let target = '';
    await fetchPinnedHttps(
      new URL('https://feed.example//rss%2F.xml?q=%2F%3F'),
      new Headers(),
      signal(),
      async () => [{ address: '8.8.8.8', family: 4 }],
      fetcher(async url => {
        target = url;
        return new Response('ok');
      })
    );
    expect(target).toBe('https://8.8.8.8//rss%2F.xml?q=%2F%3F');
  });

  test('DNS stalls and resolver failures cannot escape the request deadline', async () => {
    await expect(
      resolvePublicRemoteAddresses(
        'feed.example',
        AbortSignal.timeout(10),
        () => new Promise(() => {})
      )
    ).rejects.toMatchObject({ name: 'TimeoutError' });
    await expect(
      resolvePublicRemoteAddresses('feed.example', signal(), async () => {
        throw new Error('DNS failed');
      })
    ).rejects.toThrow('DNS failed');
  });

  test('strips sensitive and authority headers across origins while preserving same-origin credentials', async () => {
    const captured: Headers[] = [];
    const trustedFetch = fetcher(async (_url, init) => {
      captured.push(new Headers(init?.headers));
      return captured.length === 1
        ? new Response(null, { status: 302, headers: { location: '/same' } })
        : captured.length === 2
          ? new Response(null, { status: 302, headers: { location: 'https://other.example/feed' } })
          : new Response('ok');
    });
    await fetchWithRedirectPolicy(
      new URL('https://feed.example/feed'),
      new Headers({
        Authorization: 'Bearer secret',
        Cookie: 'session=secret',
        'Proxy-Authorization': 'Basic secret',
        Host: 'override.example',
        'If-None-Match': 'old',
        'X-Public': 'value',
      }),
      { fetcher: trustedFetch, maxBytes: 100, maxRedirects: 3, timeoutMs: 1000, label: 'RSS' }
    );
    expect(captured).toHaveLength(3);
    expect(captured[1]?.get('authorization')).toBe('Bearer secret');
    for (const name of ['authorization', 'cookie', 'proxy-authorization', 'host', 'if-none-match'])
      expect(captured[2]?.has(name)).toBe(false);
    expect(captured[2]?.get('x-public')).toBe('value');
  });
});
