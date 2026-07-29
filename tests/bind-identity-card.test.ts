// @see https://bun.com/docs/test/writing-tests
// @see https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname
import { describe, expect, test } from 'bun:test';
import {
  bindIdentityCards,
  formatBindIdentityStartup,
  type BindIdentitySnapshot,
} from '../lib/http/bind-identity-card.ts';

const FIXTURE: BindIdentitySnapshot = {
  port: 3847,
  hostname: '0.0.0.0',
  protocol: 'http',
  url: 'http://0.0.0.0:3847/',
  origin: 'http://0.0.0.0:3847',
  loopbackOrigin: 'http://127.0.0.1:3847',
  development: true,
};

describe('bind-identity-card', () => {
  test('bindIdentityCards indexes port through loopback', () => {
    const cards = bindIdentityCards(FIXTURE);
    expect(cards[0]?.title).toBe('port');
    expect(cards[0]?.index).toBe(1);
    expect(cards.at(-1)?.title).toBe('loopback');
    expect(cards.at(-1)?.index).toBe(7);
    expect(cards.some(c => c.fields.some(([, v]) => v.includes('3847')))).toBe(true);
  });

  test('formatBindIdentityStartup contains INDEX, port, loopback, chosen digits', () => {
    const out = formatBindIdentityStartup(FIXTURE);
    expect(out).toContain('BIND IDENTITY');
    expect(out).toContain('chosen listen after Bun.serve');
    expect(out).toContain('INDEX');
    expect(out).toContain('port');
    expect(out).toContain('loopback');
    expect(out).toContain('3847');
    expect(out).toContain('http://127.0.0.1:3847');
    expect(out).toContain('#1');
    expect(out).toContain('#7');
  });

  test('no ellipsis truncation mid-token of important values', () => {
    const out = formatBindIdentityStartup(FIXTURE);
    // Full default chain tokens (wrapped, not clipped with …)
    expect(out).toContain('BUN_PORT');
    expect(out).toContain('NODE_PORT');
    expect(out).toContain('after bind');
    expect(out).not.toContain('BUN_PORT → P…');
    expect(out).not.toContain('NODE_P…');
    expect(out).not.toContain('127.0.0.…');
    expect(out).not.toContain('0.0.0.…');
    // Chosen listen values appear in full
    expect(out).toContain('http://0.0.0.0:3847/');
    expect(out).toContain('http://127.0.0.1:3847');
  });
});
