// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  HOST_PLANE_MAP,
  HOST_PLANES,
  hostPlaneById,
  hostPlaneRows,
  hostPlaneTableRows,
  isHostPlane,
} from '../lib/http/host-planes.ts';

describe('host planes map', () => {
  test('covers bind · dns · access · pages with stable ids', () => {
    expect([...HOST_PLANES]).toEqual(['bind', 'dns', 'access', 'pages']);
    expect(HOST_PLANE_MAP.length).toBeGreaterThanOrEqual(13);
    const ids = HOST_PLANE_MAP.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('bind.port');
    expect(ids).toContain('bind.url');
    expect(ids).toContain('bind.urlPort');
    expect(ids).toContain('bind.hostname');
    expect(ids).toContain('bind.protocol');
    expect(ids).toContain('bind.urlProtocol');
    expect(ids).toContain('dns.host');
    expect(ids).toContain('dns.probeUrl');
    expect(ids).toContain('access.domain');
  });

  test('bind hostname/protocol rows are not typed as HostId', () => {
    const bindHost = HOST_PLANE_MAP.find(r => r.id === 'bind.hostname')!;
    expect(bindHost.property).toBe('server.hostname');
    expect(bindHost.type).toContain('string');
    expect(bindHost.typeOrField).not.toBe('HostId');
    expect(bindHost.defaultWhen.toLowerCase()).toContain('0.0.0.0');
    expect(bindHost.note.toLowerCase()).toContain('not hostid');

    const port = HOST_PLANE_MAP.find(r => r.id === 'bind.port')!;
    expect(port.defaultWhen).toContain('BUN_PORT');
    expect(port.fallback).toContain('port:0');

    const proto = HOST_PLANE_MAP.find(r => r.id === 'bind.protocol')!;
    expect(proto.property).toBe('server.protocol');
    expect(proto.values).toMatch(/http/);
    expect(proto.note.toLowerCase()).toContain('not part of hostid');

    const urlProto = HOST_PLANE_MAP.find(r => r.id === 'bind.urlProtocol')!;
    expect(urlProto.values).toContain('http:');

    const dnsHost = HOST_PLANE_MAP.find(r => r.id === 'dns.host')!;
    expect(dnsHost.property).toBe('HostId');
    expect(dnsHost.type).toBe('HostId');
    expect(dnsHost.example).toContain('factory-wager.com');
    expect(dnsHost.note.toLowerCase()).toContain('httpsurlforhost');
  });

  test('filters and table rows stay aligned', () => {
    expect(hostPlaneRows('bind').every(r => r.plane === 'bind')).toBeTrue();
    const table = hostPlaneTableRows();
    expect(table).toHaveLength(HOST_PLANE_MAP.length);
    expect(table[0]).toHaveProperty('typeOrField');
    expect(table[0]).toHaveProperty('example');
    expect(table[0]).not.toHaveProperty('ssot');
    expect(table[0]).not.toHaveProperty('default');

    const verbose = hostPlaneTableRows({
      includeSsot: true,
      includeDefaults: true,
      plane: 'dns',
    });
    expect(verbose.every(r => r.plane === 'dns')).toBeTrue();
    expect(verbose[0]).toHaveProperty('ssot');
    expect(verbose[0]).toHaveProperty('default');
    expect(verbose[0]).toHaveProperty('fallback');
    expect(isHostPlane('dns')).toBeTrue();
    expect(isHostPlane('ftp')).toBeFalse();
    expect(hostPlaneById('dns.host')?.property).toBe('HostId');
  });
});
