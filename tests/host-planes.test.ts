// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  HOST_PLANE_MAP,
  HOST_PLANES,
  hostPlaneRows,
  hostPlaneTableRows,
} from '../lib/http/host-planes.ts';

describe('host planes map', () => {
  test('covers bind · dns · access · pages with stable ids', () => {
    expect([...HOST_PLANES]).toEqual(['bind', 'dns', 'access', 'pages']);
    expect(HOST_PLANE_MAP.length).toBeGreaterThanOrEqual(8);
    const ids = HOST_PLANE_MAP.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('bind.hostname');
    expect(ids).toContain('dns.host');
    expect(ids).toContain('access.domain');
  });

  test('bind hostname row is not typed as HostId', () => {
    const bindHost = HOST_PLANE_MAP.find(r => r.id === 'bind.hostname')!;
    expect(bindHost.typeOrField).toContain('server.hostname');
    expect(bindHost.typeOrField).not.toBe('HostId');
    expect(bindHost.example).toContain('0.0.0.0');

    const dnsHost = HOST_PLANE_MAP.find(r => r.id === 'dns.host')!;
    expect(dnsHost.typeOrField).toBe('HostId');
    expect(dnsHost.example).toContain('factory-wager.com');
  });

  test('filters and table rows stay aligned', () => {
    expect(hostPlaneRows('bind').every(r => r.plane === 'bind')).toBeTrue();
    const table = hostPlaneTableRows();
    expect(table).toHaveLength(HOST_PLANE_MAP.length);
    expect(table[0]).toHaveProperty('typeOrField');
    expect(table[0]).toHaveProperty('example');
  });
});
