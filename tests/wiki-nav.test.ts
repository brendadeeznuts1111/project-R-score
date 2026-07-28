// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { CLOUDFLARE_DEFAULTS } from '../config/r2-env.ts';
import {
  factoryWagerWikiIndexUrl,
  PORTAL_WIKI_DROPDOWN_HREF,
  PORTAL_WEAVE_WIKI,
  WIKI_INDEX_PATH,
} from '../lib/http/wiki-nav.ts';

describe('wiki-nav SSOT', () => {
  test('index path and dropdown href align', () => {
    expect(WIKI_INDEX_PATH).toBe('/wiki-index.html');
    expect(PORTAL_WIKI_DROPDOWN_HREF).toBe(factoryWagerWikiIndexUrl());
    expect(PORTAL_WIKI_DROPDOWN_HREF).toContain(CLOUDFLARE_DEFAULTS.wikiHost);
    expect(PORTAL_WIKI_DROPDOWN_HREF).toContain('/wiki-index.html');
  });

  test('weave wiki links include index home docs harness agents', () => {
    const labels = PORTAL_WEAVE_WIKI.map(l => l.label);
    expect(labels).toContain('Wiki index');
    expect(labels).toContain('Wiki home');
    expect(labels).toContain('Docs index');
    expect(labels).toContain('Harness JIT');
    expect(labels).toContain('Registry index');
    expect(labels).toContain('AGENTS');
    for (const link of PORTAL_WEAVE_WIKI) {
      expect(link.href.startsWith('https://')).toBe(true);
    }
  });
});
