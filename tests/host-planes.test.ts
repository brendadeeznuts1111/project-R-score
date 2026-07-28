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
    expect(HOST_PLANE_MAP.length).toBeGreaterThanOrEqual(11);
    const ids = HOST_PLANE_MAP.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('bind.hostname');
    expect(ids).toContain('bind.protocol');
    expect(ids).toContain('bind.urlProtocol');
    expect(ids).toContain('dns.host');
    expect(ids).toContain('dns.probeUrl');
    expect(ids).toContain('access.domain');
  });

  test('bind hostname/protocol rows are not typed as HostId', () => {
    const bindHost = HOST_PLANE_MAP.find(r => r.id === 'bind.hostname')!;
    expect(bindHost.typeOrField).toContain('server.hostname');
    expect(bindHost.typeOrField).not.toBe('HostId');
    expect(bindHost.example).toContain('0.0.0.0');

    const proto = HOST_PLANE_MAP.find(r => r.id === 'bind.protocol')!;
    expect(proto.typeOrField).toContain('server.protocol');
    expect(proto.example).toMatch(/http/);
    expect(proto.note.toLowerCase()).toContain('not part of hostid');

    const urlProto = HOST_PLANE_MAP.find(r => r.id === 'bind.urlProtocol')!;
    expect(urlProto.example).toContain('http:');

    const dnsHost = HOST_PLANE_MAP.find(r => r.id === 'dns.host')!;
    expect(dnsHost.typeOrField).toBe('HostId');
    expect(dnsHost.example).toContain('factory-wager.com');
    expect(dnsHost.note.toLowerCase()).toContain('httpsurlforhost');
  });

  test('filters and table rows stay aligned', () => {
    expect(hostPlaneRows('bind').every(r => r.plane === 'bind')).toBeTrue();
    const table = hostPlaneTableRows();
    expect(table).toHaveLength(HOST_PLANE_MAP.length);
    expect(table[0]).toHaveProperty('typeOrField');
    expect(table[0]).toHaveProperty('example');
  });
});
