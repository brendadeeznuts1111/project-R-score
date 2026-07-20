/**
 * Catalog helpers: dedup scoring + canonical page preference.
 */
import { describe, expect, test } from 'bun:test';
import {
  normalizeName,
  pageBase,
  pageAnchor,
  scoreCanonicalPage,
  pickCanonicalPage,
  sectionFromUrl,
  inferType,
  compareSemver,
} from '../tools/bun-docs-catalog.ts';

describe('bun-docs-catalog helpers', () => {
  test('normalizeName collapses bun. prefix case', () => {
    expect(normalizeName('Bun.WebView')).toBe('bun.webview');
    expect(normalizeName('bun.webview')).toBe('bun.webview');
  });

  test('pageBase strips md and fragment', () => {
    expect(pageBase('https://bun.com/docs/runtime/utils.md#bun-inspect')).toBe(
      'https://bun.com/docs/runtime/utils'
    );
    expect(pageAnchor('https://bun.com/docs/runtime/utils#bun-inspect')).toBe('bun-inspect');
  });

  test('scoreCanonicalPage prefers /reference/ over /guides/', () => {
    const ref = scoreCanonicalPage('https://bun.com/reference/bun/sliceAnsi', 'Bun.sliceAnsi');
    const guide = scoreCanonicalPage('https://bun.com/docs/guides/util/slice-ansi', 'Bun.sliceAnsi');
    const runtime = scoreCanonicalPage('https://bun.com/docs/runtime/utils', 'Bun.sliceAnsi');
    expect(ref).toBeGreaterThan(guide);
    expect(ref).toBeGreaterThan(runtime);
  });

  test('pickCanonicalPage chooses reference first', () => {
    const picked = pickCanonicalPage(
      [
        'https://bun.com/docs/guides/util/foo',
        'https://bun.com/docs/runtime/utils',
        'https://bun.com/reference/bun/sliceAnsi',
      ],
      'Bun.sliceAnsi'
    );
    expect(picked).toContain('/reference/');
  });

  test('sectionFromUrl classifies runtime bundler test guides', () => {
    expect(sectionFromUrl('https://bun.com/docs/runtime/cron')).toBe('runtime');
    expect(sectionFromUrl('https://bun.com/docs/bundler')).toBe('bundler');
    expect(sectionFromUrl('https://bun.com/docs/test/mocks')).toBe('test');
    expect(sectionFromUrl('https://bun.com/docs/guides/http/fetch')).toBe('guides');
  });

  test('inferType classifies api flag config concept', () => {
    expect(inferType('Bun.cron', 'https://bun.com/docs/runtime/cron')).toBe('api');
    expect(inferType('--console-depth', 'https://bun.com/docs/runtime/console')).toBe('cli-flag');
    expect(inferType('bunfig.toml', 'https://bun.com/docs/runtime/bunfig')).toBe('config');
    expect(inferType('Code coverage', 'https://bun.com/docs/test/code-coverage')).toBe('concept');
  });

  test('compareSemver orders release versions', () => {
    expect(compareSemver('1.3.14', '1.4.0')).toBeLessThan(0);
    expect(compareSemver('1.4.0', '1.3.14')).toBeGreaterThan(0);
    expect(compareSemver('1.4.0', '1.4.0')).toBe(0);
  });
});
