import { describe, expect, test } from 'bun:test';
import { buildReport, parseClearRequest } from '../../src/core/barber-server';

describe('barber-server helpers', () => {
  test('parseClearRequest matches /clear with key', () => {
    const url = new URL('http://localhost/clear?key=secret');
    expect(parseClearRequest(url, 'secret')).toBe(true);
  });

  test('parseClearRequest rejects invalid key', () => {
    const url = new URL('http://localhost/clear?key=bad');
    expect(parseClearRequest(url, 'secret')).toBe(false);
  });

  test('parseClearRequest rejects missing key', () => {
    const url = new URL('http://localhost/clear');
    expect(parseClearRequest(url, 'secret')).toBe(false);
  });

  test('buildReport produces stable structure', () => {
    const report = buildReport({ id: 'jb', name: 'John' });
    expect(report.revenue).toBe(600);
    expect(report.tips).toBe(50);
    expect(report.barbers.id).toBe('jb');
  });
});
