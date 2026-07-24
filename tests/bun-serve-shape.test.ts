// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/http/server#reference — Server interface
// @see https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname — port
import { describe, expect, test } from 'bun:test';
import {
  BUN_SERVE_CROSS_REF,
  BUN_SERVE_DEFAULT_PORT_ENV,
  BUN_SERVE_DEFAULT_PORT_FALLBACK,
  BUN_SERVE_SHAPE_MATRIX,
  isTcpServer,
  probeServerShape,
  renderBunServeShapeMatrix,
  resolveServeDefaultPort,
  resolveBunServeDefaultPort,
  parseBunPortFlag,
  serverShapeViolations,
} from '../lib/http/bun-serve-shape.ts';
import { BUN_SERVER_PORT_DOCS, serverIdentity } from '../lib/http/bun-server.ts';

describe('lib/http/bun-serve-shape — cross-reference', () => {
  test('matrix covers port, protocol, and url fields', () => {
    const fields = BUN_SERVE_SHAPE_MATRIX.map(r => r.field);
    expect(fields).toContain('server.port');
    expect(fields).toContain('server.protocol');
    expect(fields).toContain('server.url.protocol');
    expect(BUN_SERVE_SHAPE_MATRIX.find(r => r.field === 'server.protocol')?.docsReference).toBe(
      'missing'
    );
  });

  test('cross-ref URLs point at docs, bun-types repo, and RSS', () => {
    expect(BUN_SERVE_CROSS_REF.docsReference).toContain('#reference');
    expect(BUN_SERVE_CROSS_REF.docsPortHostname).toBe(BUN_SERVER_PORT_DOCS);
    expect(BUN_SERVE_CROSS_REF.bunTypesServe).toContain('oven-sh/bun');
    expect(BUN_SERVE_CROSS_REF.rss).toBe('https://bun.com/rss.xml');
  });

  test('default port env order matches Bun docs', () => {
    expect(BUN_SERVE_DEFAULT_PORT_ENV).toEqual(['BUN_PORT', 'PORT', 'NODE_PORT']);
    expect(BUN_SERVE_DEFAULT_PORT_FALLBACK).toBe(3000);
  });

  test('resolveServeDefaultPort follows BUN_PORT → PORT → NODE_PORT → 3000', () => {
    expect(resolveServeDefaultPort({})).toBe(3000);
    expect(resolveServeDefaultPort({ NODE_PORT: '4001' })).toBe(4001);
    expect(resolveServeDefaultPort({ PORT: '4002', NODE_PORT: '4001' })).toBe(4002);
    expect(resolveServeDefaultPort({ BUN_PORT: '4003', PORT: '4002', NODE_PORT: '4001' })).toBe(
      4003
    );
    expect(resolveServeDefaultPort({ BUN_PORT: '', PORT: '3099' })).toBe(3099);
  });

  test('parseBunPortFlag and resolveBunServeDefaultPort honor --port over env', () => {
    expect(parseBunPortFlag(['bun', '--port=4002', 'scripts/serve-public.ts'])).toBe(4002);
    expect(parseBunPortFlag(['bun', '--port', '4003', 'scripts/serve-public.ts'])).toBe(4003);
    expect(
      resolveBunServeDefaultPort({ BUN_PORT: '3099', PORT: '3000' }, [
        'bun',
        '--port=4002',
        'scripts/serve-public.ts',
      ])
    ).toBe(4002);
    expect(resolveBunServeDefaultPort({ BUN_PORT: '3099' }, ['bun', 'scripts/serve-public.ts'])).toBe(
      3099
    );
  });

  test('renderBunServeShapeMatrix includes drift row for server.protocol', () => {
    const md = renderBunServeShapeMatrix();
    expect(md).toContain('server.protocol');
    expect(md).toContain('missing');
  });

  test('probeServerShape + serverIdentity agree on TCP server', async () => {
    const server = Bun.serve({
      port: 0,
      hostname: '127.0.0.1',
      development: false,
      fetch: () => new Response('ok'),
    });
    try {
      expect(isTcpServer(server)).toBe(true);
      const probe = probeServerShape(server);
      expect(probe.protocol).toBe('http');
      expect(probe.urlProtocol).toBe('http:');
      expect(probe.urlPort).toBe(String(probe.port));
      expect(serverShapeViolations(probe)).toEqual([]);

      const id = serverIdentity(server);
      expect(id.port).toBe(probe.port);
      expect(id.protocol).toBe(probe.protocol);
      expect(id.urlProtocol).toBe(probe.urlProtocol);
      expect(id.origin).toBe(probe.origin);
    } finally {
      await server.stop(true);
    }
  });

  test('default hostname is localhost when omitted (runtime; docs options example uses 0.0.0.0)', async () => {
    const server = Bun.serve({ port: 0, fetch: () => new Response('ok') });
    try {
      const probe = probeServerShape(server);
      expect(probe.hostname).toBe('localhost');
      expect(probe.href).toMatch(/^http:\/\/localhost:\d+\/$/);
    } finally {
      await server.stop(true);
    }
  });
});
