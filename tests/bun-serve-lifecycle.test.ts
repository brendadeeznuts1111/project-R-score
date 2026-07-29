// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/http/server#idletimeout — idleTimeout
// @see https://bun.com/docs/runtime/http/server#server-timeout-request-seconds — server.timeout
// @see https://bun.com/docs/runtime/http/server#reference — Server methods
import { describe, expect, test } from 'bun:test';
import {
  BUN_SERVE_METHOD_MATRIX,
  BUN_SERVE_OPTION_MATRIX,
  bunServeMethodTableRows,
  bunServeOptionTableRows,
} from '../lib/http/bun-serve-lifecycle.ts';

describe('lib/http/bun-serve-lifecycle — method + option matrices', () => {
  test('method matrix includes timeout and lifecycle APIs', () => {
    const props = BUN_SERVE_METHOD_MATRIX.map(r => r.property);
    expect(props).toEqual([
      'server.stop',
      'server.reload',
      'server.fetch',
      'server.upgrade',
      'server.publish',
      'server.subscriberCount',
      'server.requestIP',
      'server.timeout',
      'server.ref',
      'server.unref',
    ]);
    for (const r of BUN_SERVE_METHOD_MATRIX) {
      expect(r.kind).toBe('method');
      expect(r.signature.length).toBeGreaterThan(0);
      expect(r.defaultWhen.length).toBeGreaterThan(0);
    }
    const timeout = BUN_SERVE_METHOD_MATRIX.find(r => r.property === 'server.timeout')!;
    expect(timeout.signature).toContain('timeout(request');
    expect(timeout.values).toContain('0');
    expect(timeout.note.toLowerCase()).toContain('idle');
  });

  test('option matrix covers idleTimeout defaults and TLS→protocol', () => {
    const props = BUN_SERVE_OPTION_MATRIX.map(r => r.property);
    expect(props).toContain('idleTimeout');
    expect(props).toContain('port');
    expect(props).toContain('hostname');
    expect(props).toContain('tls');
    expect(props).toContain('development');
    expect(props).toContain('unix');
    expect(props.some(p => p.includes('WS'))).toBeTrue();

    const idle = BUN_SERVE_OPTION_MATRIX.find(r => r.property === 'idleTimeout')!;
    expect(idle.kind).toBe('option');
    expect(idle.defaultWhen).toContain('omit → 10 seconds');
    expect(idle.defaultWhen).toContain('max 255');
    expect(idle.defaultWhen).toContain('0 = off');
    expect(idle.values).toContain('255');

    const tls = BUN_SERVE_OPTION_MATRIX.find(r => r.property === 'tls')!;
    expect(tls.fallback.toLowerCase()).toContain('https');
    expect(tls.note.toLowerCase()).toContain('protocol');

    const ws = BUN_SERVE_OPTION_MATRIX.find(r => r.property.includes('WS'))!;
    expect(ws.defaultWhen).toContain('120');
    expect(ws.fallback.toLowerCase()).toContain('http');
  });

  test('table row helpers expose default/fallback columns', () => {
    const methods = bunServeMethodTableRows();
    const options = bunServeOptionTableRows();
    expect(methods.some(r => r.property === 'server.timeout')).toBeTrue();
    expect(options.some(r => r.property === 'idleTimeout' && r.default.includes('10'))).toBeTrue();
    expect(methods[0]).toHaveProperty('kind', 'method');
    expect(options[0]).toHaveProperty('kind', 'option');
  });
});
